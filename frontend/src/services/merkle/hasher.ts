/**
 * Merkle Tree Hasher for Browser
 * Browser-compatible hashing using Web Crypto API
 */

import { MerkleNode, NodeType } from './MerkleNode';

export class MerkleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MerkleError';
  }
}

export class MerkleHasher {
  /**
   * Hash content using SHA-256 (Web Crypto API)
   */
  async hashContent(content: string | ArrayBuffer): Promise<string> {
    const encoder = new TextEncoder();
    const data =
      typeof content === 'string'
        ? encoder.encode(content)
        : new Uint8Array(content);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Hash a file object
   */
  async hashFile(file: File): Promise<string> {
    const content = await this.readFileContent(file);
    return this.hashContent(content);
  }

  /**
   * Hash a directory by combining children hashes
   */
  async hashDirectory(
    children: Array<{ hash: string; path: string }>
  ): Promise<string> {
    // Sort children by path for consistent hashing
    const sorted = [...children].sort((a, b) => a.path.localeCompare(b.path));

    // Combine all hashes and paths
    const combined = sorted.map((c) => c.hash + c.path).join('');
    return this.hashContent(combined);
  }

  /**
   * Build Merkle tree from File objects (for drag-drop/upload)
   */
  async buildTreeFromFiles(files: File[]): Promise<MerkleNode> {
    const fileNodes: MerkleNode[] = [];

    for (const file of files) {
      const content = await this.readFileContent(file);
      const hash = await this.hashContent(content);

      fileNodes.push(
        new MerkleNode({
          hash,
          nodeType: NodeType.File,
          path: file.name,
          size: file.size,
          modifiedAt: Math.floor(file.lastModified / 1000),
          createdAt: Math.floor(file.lastModified / 1000),
        })
      );
    }

    // Create root directory node
    const rootHash = await this.hashDirectory(
      fileNodes.map((f) => ({ hash: f.hash, path: f.path }))
    );

    return new MerkleNode({
      hash: rootHash,
      nodeType: NodeType.Directory,
      path: 'root',
      size: 0,
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      children: fileNodes,
    });
  }

  /**
   * Build tree from FileSystemHandle (File System Access API)
   */
  async buildTreeFromHandle(
    dirHandle: FileSystemDirectoryHandle
  ): Promise<MerkleNode> {
    const children: MerkleNode[] = [];

    for await (const entry of dirHandle.values()) {
      // Skip hidden files
      if (entry.name.startsWith('.')) continue;

      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const content = await this.readFileContent(file);
        const hash = await this.hashContent(content);

        children.push(
          new MerkleNode({
            hash,
            nodeType: NodeType.File,
            path: entry.name,
            size: file.size,
            modifiedAt: Math.floor(file.lastModified / 1000),
            createdAt: Math.floor(file.lastModified / 1000),
          })
        );
      } else if (entry.kind === 'directory') {
        const subDirHandle = entry as FileSystemDirectoryHandle;
        const subTree = await this.buildTreeFromHandle(subDirHandle);
        children.push(subTree);
      }
    }

    // Sort children
    children.sort((a, b) => a.path.localeCompare(b.path));

    const hash = await this.hashDirectory(
      children.map((c) => ({ hash: c.hash, path: c.path }))
    );

    return new MerkleNode({
      hash,
      nodeType: NodeType.Directory,
      path: dirHandle.name,
      size: 0,
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      children,
    });
  }

  /**
   * Build tree from in-memory file structure (for editor)
   */
  async buildTreeFromMemory(
    files: Array<{ path: string; content: string; lastModified: number }>
  ): Promise<MerkleNode> {
    if (files.length === 0) {
      throw new MerkleError('No files provided');
    }

    const fileNodes: MerkleNode[] = [];

    for (const file of files) {
      const hash = await this.hashContent(file.content);

      fileNodes.push(
        new MerkleNode({
          hash,
          nodeType: NodeType.File,
          path: file.path,
          size: file.content.length,
          modifiedAt: Math.floor(file.lastModified / 1000),
          createdAt: Math.floor(file.lastModified / 1000),
        })
      );
    }

    // Sort files
    fileNodes.sort((a, b) => a.path.localeCompare(b.path));

    const rootHash = await this.hashDirectory(
      fileNodes.map((f) => ({ hash: f.hash, path: f.path }))
    );

    return new MerkleNode({
      hash: rootHash,
      nodeType: NodeType.Directory,
      path: 'root',
      size: 0,
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      children: fileNodes,
    });
  }

  /**
   * Build tree from file structure with folder hierarchy
   */
  async buildTreeFromFileSystem(
    files: Array<{ path: string; content: string; lastModified: number }>
  ): Promise<MerkleNode> {
    if (files.length === 0) {
      throw new MerkleError('No files provided');
    }

    // Build nested structure
    const root = this.buildNestedStructure(files);

    // Convert to Merkle tree
    return await this.buildTreeRecursive(root, 'root');
  }

  /**
   * Build nested file structure from flat file list
   */
  private buildNestedStructure(
    files: Array<{ path: string; content: string; lastModified: number }>
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
            lastModified: file.lastModified,
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
  private async buildTreeRecursive(node: any, path: string): Promise<MerkleNode> {
    if (node.type === 'file') {
      const hash = await this.hashContent(node.content);
      return new MerkleNode({
        hash,
        nodeType: NodeType.File,
        path,
        size: node.content.length,
        modifiedAt: Math.floor(node.lastModified / 1000),
        createdAt: Math.floor(node.lastModified / 1000),
      });
    }

    // It's a directory
    const children: MerkleNode[] = [];
    const entries = Object.entries(node.children);

    for (const [name, childNode] of entries) {
      const childPath = path === 'root' ? name : `${path}/${name}`;
      const childMerkleNode = await this.buildTreeRecursive(childNode, childPath);
      children.push(childMerkleNode);
    }

    // Sort children
    children.sort((a, b) => a.path.localeCompare(b.path));

    const hash = await this.hashDirectory(
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
   * Read file content as text
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new MerkleError('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Compute hash for a string (utility method)
   */
  async computeHash(text: string): Promise<string> {
    return this.hashContent(text);
  }
}
