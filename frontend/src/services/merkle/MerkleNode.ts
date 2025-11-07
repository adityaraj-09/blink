/**
 * Merkle Tree Node for Browser
 * Browser-compatible version of src/node.ts
 */

export enum NodeType {
  File = 'File',
  Directory = 'Directory',
}

export interface MerkleNodeData {
  hash: string;
  nodeType: NodeType;
  path: string;
  size: number;
  modifiedAt: number;
  createdAt: number;
  children?: MerkleNode[];
}

export class MerkleNode {
  hash: string;
  nodeType: NodeType;
  path: string;
  size: number;
  modifiedAt: number;
  createdAt: number;
  children?: MerkleNode[];
  isLeaf: boolean;

  constructor(data: MerkleNodeData) {
    this.hash = data.hash;
    this.nodeType = data.nodeType;
    this.path = data.path;
    this.size = data.size;
    this.modifiedAt = data.modifiedAt;
    this.createdAt = data.createdAt;
    this.children = data.children;
    this.isLeaf = this.nodeType === NodeType.File;
  }

  getHash(): string {
    return this.hash;
  }

  getPath(): string {
    return this.path;
  }

  getChildren(): MerkleNode[] | undefined {
    return this.children;
  }

  isLeafNode(): boolean {
    return this.isLeaf;
  }

  getNodeType(): NodeType {
    return this.nodeType;
  }

  getSize(): number {
    return this.size;
  }

  getModifiedAt(): number {
    return this.modifiedAt;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  /**
   * Find a node by its path
   */
  findByPath(targetPath: string): MerkleNode | undefined {
    if (this.path === targetPath) {
      return this;
    }

    if (this.children) {
      for (const child of this.children) {
        const found = child.findByPath(targetPath);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  /**
   * Calculate total size of this node and all its children
   */
  totalSize(): number {
    let total = this.size;
    if (this.children) {
      for (const child of this.children) {
        total += child.totalSize();
      }
    }
    return total;
  }

  /**
   * Count total number of nodes in the tree
   */
  countNodes(): number {
    let count = 1;
    if (this.children) {
      for (const child of this.children) {
        count += child.countNodes();
      }
    }
    return count;
  }

  /**
   * Count total number of files in the tree
   */
  countFiles(): number {
    if (this.isLeaf) {
      return 1;
    }
    let count = 0;
    if (this.children) {
      for (const child of this.children) {
        count += child.countFiles();
      }
    }
    return count;
  }

  /**
   * Print the tree structure (for debugging)
   */
  printTree(indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    const nodeType = this.isLeaf ? '📄' : '📁';
    let result = `${prefix}${nodeType} ${this.path} (${this.hash.substring(0, 8)})\n`;

    if (this.children) {
      for (const child of this.children) {
        result += child.printTree(indent + 1);
      }
    }

    return result;
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): object {
    return {
      hash: this.hash,
      nodeType: this.nodeType,
      path: this.path,
      size: this.size,
      modifiedAt: this.modifiedAt,
      createdAt: this.createdAt,
      children: this.children?.map((c) => c.toJSON()),
      isLeaf: this.isLeaf,
    };
  }

  /**
   * Create a MerkleNode from JSON
   */
  static fromJSON(json: any): MerkleNode {
    const children = json.children?.map((c: any) => MerkleNode.fromJSON(c));
    return new MerkleNode({
      hash: json.hash,
      nodeType: json.nodeType as NodeType,
      path: json.path,
      size: json.size,
      modifiedAt: json.modifiedAt,
      createdAt: json.createdAt,
      children,
    });
  }
}
