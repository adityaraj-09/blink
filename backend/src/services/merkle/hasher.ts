/**
 * Merkle Tree Hasher for Node.js Backend
 * Uses Node.js crypto module instead of Web Crypto API
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { MerkleNode, NodeType } from './MerkleNode';

export class MerkleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MerkleError';
  }
}

export class MerkleHasher {
  /**
   * Hash content using SHA-256 (Node.js crypto)
   */
  hashContent(content: string | Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  /**
   * Hash a file from filesystem
   */
  hashFileFromPath(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return this.hashContent(content);
  }

  /**
   * Hash a directory by combining children hashes
   */
  hashDirectory(children: Array<{ hash: string; path: string }>): string {
    // Sort children by path for consistent hashing
    const sorted = [...children].sort((a, b) => a.path.localeCompare(b.path));

    // Combine all hashes and paths
    const combined = sorted.map((c) => c.hash + c.path).join('');
    return this.hashContent(combined);
  }

  /**
   * Build Merkle tree from filesystem directory
   */
  async buildTreeFromDirectory(dirPath: string, rootName: string = 'root'): Promise<MerkleNode> {
    if (!fs.existsSync(dirPath)) {
      throw new MerkleError(`Directory does not exist: ${dirPath}`);
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      throw new MerkleError(`Path is not a directory: ${dirPath}`);
    }

    return await this.buildTreeRecursive(dirPath, rootName);
  }

  /**
   * Recursively build tree from filesystem
   */
  private async buildTreeRecursive(fullPath: string, relativePath: string): Promise<MerkleNode> {
    const stats = fs.statSync(fullPath);

    if (stats.isFile()) {
      const content = fs.readFileSync(fullPath);
      const hash = this.hashContent(content);

      return new MerkleNode({
        hash,
        nodeType: NodeType.File,
        path: relativePath,
        size: stats.size,
        modifiedAt: Math.floor(stats.mtimeMs / 1000),
        createdAt: Math.floor(stats.birthtimeMs / 1000),
      });
    }

    // It's a directory
    const children: MerkleNode[] = [];
    const entries = fs.readdirSync(fullPath);

    for (const entry of entries) {
      // Skip hidden files and directories
      if (entry.startsWith('.')) continue;

      const childFullPath = path.join(fullPath, entry);
      const childRelativePath = relativePath === 'root' ? entry : `${relativePath}/${entry}`;

      try {
        const childNode = await this.buildTreeRecursive(childFullPath, childRelativePath);
        children.push(childNode);
      } catch (err) {
        console.warn(`Skipping ${childFullPath}:`, (err as Error).message);
      }
    }

    // Sort children
    children.sort((a, b) => a.path.localeCompare(b.path));

    const hash = this.hashDirectory(
      children.map((c) => ({ hash: c.hash, path: c.path }))
    );

    return new MerkleNode({
      hash,
      nodeType: NodeType.Directory,
      path: relativePath,
      size: 0,
      modifiedAt: Math.floor(stats.mtimeMs / 1000),
      createdAt: Math.floor(stats.birthtimeMs / 1000),
      children,
    });
  }

  /**
   * Build tree from in-memory file list with content
   */
  async buildTreeFromFileList(
    files: Array<{ path: string; content: string; lastModified?: number }>
  ): Promise<MerkleNode> {
    if (files.length === 0) {
      throw new MerkleError('No files provided');
    }

    // Build nested structure
    const root = this.buildNestedStructure(files);

    // Convert to Merkle tree
    return await this.buildTreeFromNested(root, 'root');
  }

  /**
   * Build nested file structure from flat file list
   */
  private buildNestedStructure(
    files: Array<{ path: string; content: string; lastModified?: number }>
  ): any {
    const root: any = { type: 'directory', children: {} };

    for (const file of files) {
      const parts = file.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        if (isLast) {
          // It's a file
          current.children[part] = {
            type: 'file',
            content: file.content,
            lastModified: file.lastModified || Date.now(),
          };
        } else {
          // It's a directory
          if (!current.children[part]) {
            current.children[part] = { type: 'directory', children: {} };
          }
          current = current.children[part];
        }
      }
    }

    return root;
  }

  /**
   * Recursively build Merkle tree from nested structure
   */
  private async buildTreeFromNested(node: any, path: string): Promise<MerkleNode> {
    if (node.type === 'file') {
      const hash = this.hashContent(node.content);
      return new MerkleNode({
        hash,
        nodeType: NodeType.File,
        path,
        size: Buffer.from(node.content).length,
        modifiedAt: Math.floor(node.lastModified / 1000),
        createdAt: Math.floor(node.lastModified / 1000),
      });
    }

    // It's a directory
    const children: MerkleNode[] = [];
    const entries = Object.entries(node.children);

    for (const [name, childNode] of entries) {
      const childPath = path === 'root' ? name : `${path}/${name}`;
      const childMerkleNode = await this.buildTreeFromNested(childNode, childPath);
      children.push(childMerkleNode);
    }

    // Sort children
    children.sort((a, b) => a.path.localeCompare(b.path));

    const hash = this.hashDirectory(
      children.map((c) => ({ hash: c.hash, path: c.path }))
    );

    return new MerkleNode({
      hash,
      nodeType: NodeType.Directory,
      path,
      size: 0,
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      children,
    });
  }

  /**
   * Compute hash for a string (utility method)
   */
  computeHash(text: string): string {
    return this.hashContent(text);
  }
}
