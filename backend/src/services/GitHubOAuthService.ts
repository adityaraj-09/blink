import axios from 'axios';
import { DatabaseSchema } from '../database/schema';
import { getEncryptionService } from '../utils/encryption';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
}

interface GitHubIntegration {
  id: number;
  user_id: string;
  github_user_id: string;
  github_username: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: number | null;
  scopes: string[];
  created_at: number;
  updated_at: number;
}

export class GitHubOAuthService {
  private clientId: string;
  private clientSecret: string;
  private callbackUrl: string;
  private db: DatabaseSchema;
  private encryption = getEncryptionService();

  constructor(db: DatabaseSchema) {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.callbackUrl = process.env.GITHUB_CALLBACK_URL || '';
    this.db = db;

    if (!this.clientId || !this.clientSecret || !this.callbackUrl) {
      throw new Error('GitHub OAuth configuration is missing in environment variables');
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'repo user:email',
      state,
      allow_signup: 'true'
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.callbackUrl
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.data.access_token) {
        throw new Error('Failed to obtain access token from GitHub');
      }

      return response.data;
    } catch (error: any) {
      console.error('GitHub OAuth token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for token');
    }
  }

  /**
   * Fetch GitHub user information
   */
  async getGitHubUser(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await axios.get<GitHubUser>('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('GitHub user fetch error:', error.response?.data || error.message);
      throw new Error('Failed to fetch GitHub user information');
    }
  }

  /**
   * Save GitHub integration to database
   */
  async saveIntegration(
    userId: string,
    tokenData: GitHubTokenResponse,
    githubUser: GitHubUser
  ): Promise<void> {
    const now = Date.now();
    const encryptedToken = this.encryption.encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? this.encryption.encrypt(tokenData.refresh_token)
      : null;

    const tokenExpiresAt = tokenData.expires_in
      ? now + tokenData.expires_in * 1000
      : null;

    const stmt = this.db.getDb().prepare(`
      INSERT INTO github_integrations (
        user_id, github_user_id, github_username,
        access_token, refresh_token, token_expires_at,
        scopes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        github_user_id = excluded.github_user_id,
        github_username = excluded.github_username,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_expires_at = excluded.token_expires_at,
        scopes = excluded.scopes,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      userId,
      githubUser.id.toString(),
      githubUser.login,
      encryptedToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      tokenData.scope,
      now,
      now
    );
  }

  /**
   * Get GitHub integration for user
   */
  async getIntegration(userId: string): Promise<GitHubIntegration | null> {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM github_integrations WHERE user_id = ?
    `);

    const row = stmt.get(userId) as any;
    if (!row) {
      return null;
    }

    // Decrypt tokens
    const accessToken = this.encryption.decrypt(row.access_token);
    const refreshToken = row.refresh_token
      ? this.encryption.decrypt(row.refresh_token)
      : null;

    return {
      id: row.id,
      user_id: row.user_id,
      github_user_id: row.github_user_id,
      github_username: row.github_username,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: row.token_expires_at,
      scopes: row.scopes.split(' '),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Check if user has connected GitHub
   */
  async isConnected(userId: string): Promise<boolean> {
    const integration = await this.getIntegration(userId);
    return integration !== null;
  }

  /**
   * Revoke GitHub access token and delete integration
   */
  async revokeToken(userId: string): Promise<void> {
    const integration = await this.getIntegration(userId);
    if (!integration) {
      return;
    }

    // Revoke token on GitHub
    try {
      await axios.delete(
        `https://api.github.com/applications/${this.clientId}/token`,
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret
          },
          data: {
            access_token: integration.access_token
          }
        }
      );
    } catch (error: any) {
      console.error('Failed to revoke GitHub token:', error.message);
      // Continue with local deletion even if revocation fails
    }

    // Delete from database
    const stmt = this.db.getDb().prepare(`
      DELETE FROM github_integrations WHERE user_id = ?
    `);
    stmt.run(userId);
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if token needs refresh (for OAuth Apps with expiration)
   */
  needsRefresh(integration: GitHubIntegration): boolean {
    if (!integration.token_expires_at) {
      return false; // Token doesn't expire
    }

    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return integration.token_expires_at - now < bufferTime;
  }
}
