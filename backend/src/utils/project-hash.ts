import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Generate unique SHA256 hash for local project identification
 *
 * The hash is computed from:
 * - userId: The authenticated user's ID
 * - absoluteFolderPath: The full path to the folder
 * - folderName: The name of the folder
 *
 * This ensures:
 * - Same folder opened by different users = different projects
 * - Same user opening same folder = same project (no re-ingestion)
 * - Folder moved/renamed = new project (intentional for data integrity)
 */
export function generateLocalProjectHash(
    userId: string,
    absoluteFolderPath: string,
    folderName: string
): string {
    // Normalize path (handle Windows/Unix differences)
    const normalizedPath = path.normalize(absoluteFolderPath)
        .toLowerCase()
        .replace(/\\/g, '/');

    // Create composite string
    const composite = `${userId}:${normalizedPath}:${folderName}`;

    // Generate SHA256 hash
    return crypto
        .createHash('sha256')
        .update(composite)
        .digest('hex');
}

/**
 * Generate short hash for display purposes (first 12 characters)
 */
export function getShortHash(fullHash: string): string {
    return fullHash.substring(0, 12);
}

/**
 * Validate that a string is a valid SHA256 hash
 */
export function isValidHash(hash: string): boolean {
    return /^[a-f0-9]{64}$/i.test(hash);
}
