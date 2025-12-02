import * as crypto from 'crypto';

/**
 * Encryption utility for securely storing sensitive data like OAuth tokens
 * Uses AES-256-GCM for encryption
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private encryptionKey: Buffer;

  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
    // Derive a 32-byte key from the provided key
    this.encryptionKey = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  /**
   * Encrypt a string value
   * @param text Plain text to encrypt
   * @returns Encrypted string in format: iv:authTag:encryptedData
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted format
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedText Encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted plain text
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a random encryption key (for setup)
   * @returns 32-character random key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton instance
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    let key = process.env.ENCRYPTION_KEY;
    
    // For development: generate a default key if not set (warn user)
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'ENCRYPTION_KEY environment variable is required in production. ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
      }
      
      // Development fallback: use a default key (not secure, but allows dev to proceed)
      console.warn('⚠️  WARNING: ENCRYPTION_KEY not set. Using development default key. ' +
                   'This is NOT secure for production!');
      console.warn('   Generate a secure key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      key = 'development-default-encryption-key-not-secure-change-in-production';
    }
    
    encryptionService = new EncryptionService(key);
  }
  return encryptionService;
}
