import { Octokit } from '@octokit/rest';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
  private: boolean;
  description: string | null;
  clone_url: string;
  html_url: string;
  default_branch: string;
  language: string | null;
  size: number;
  updated_at: string;
  created_at: string;
  pushed_at: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
}

export interface ListReposOptions {
  page?: number;
  perPage?: number;
  type?: 'all' | 'owner' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
}

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken
    });
  }

  /**
   * List user's repositories
   */
  async listRepositories(options: ListReposOptions = {}): Promise<{
    repositories: GitHubRepository[];
    totalCount: number;
  }> {
    const {
      page = 1,
      perPage = 30,
      type = 'owner',
      sort = 'updated',
      direction = 'desc'
    } = options;

    try {
      const response = await this.octokit.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
        type,
        sort,
        direction
      });

      return {
        repositories: response.data as GitHubRepository[],
        totalCount: response.data.length
      };
    } catch (error: any) {
      console.error('Failed to list repositories:', error.message);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo
      });

      return response.data as GitHubRepository;
    } catch (error: any) {
      console.error('Failed to get repository:', error.message);
      throw new Error(`Failed to fetch repository ${owner}/${repo}`);
    }
  }

  /**
   * List branches in repository
   */
  async listBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    try {
      const response = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      return response.data as GitHubBranch[];
    } catch (error: any) {
      console.error('Failed to list branches:', error.message);
      throw new Error(`Failed to fetch branches for ${owner}/${repo}`);
    }
  }

  /**
   * Get commits for a branch
   */
  async getCommits(
    owner: string,
    repo: string,
    branch?: string,
    limit: number = 20
  ): Promise<GitHubCommit[]> {
    try {
      const response = await this.octokit.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: limit
      });

      return response.data as GitHubCommit[];
    } catch (error: any) {
      console.error('Failed to get commits:', error.message);
      throw new Error(`Failed to fetch commits for ${owner}/${repo}`);
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      const data = response.data as any;
      if (data.type !== 'file') {
        throw new Error('Path does not point to a file');
      }

      // Content is base64 encoded
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return content;
    } catch (error: any) {
      console.error('Failed to get file content:', error.message);
      throw new Error(`Failed to fetch file ${path} from ${owner}/${repo}`);
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    data: {
      title: string;
      body: string;
      head: string; // Source branch
      base: string; // Target branch
    }
  ): Promise<any> {
    try {
      const response = await this.octokit.pulls.create({
        owner,
        repo,
        title: data.title,
        body: data.body,
        head: data.head,
        base: data.base
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to create pull request:', error.message);
      throw new Error('Failed to create pull request');
    }
  }

  /**
   * Check if repository exists and user has access
   */
  async hasAccess(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.repos.get({
        owner,
        repo
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get authenticated user's information
   */
  async getAuthenticatedUser(): Promise<any> {
    try {
      const response = await this.octokit.users.getAuthenticated();
      return response.data;
    } catch (error: any) {
      console.error('Failed to get authenticated user:', error.message);
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Check rate limit status
   */
  async getRateLimit(): Promise<any> {
    try {
      const response = await this.octokit.rateLimit.get();
      return response.data;
    } catch (error: any) {
      console.error('Failed to get rate limit:', error.message);
      throw new Error('Failed to fetch rate limit information');
    }
  }
}
