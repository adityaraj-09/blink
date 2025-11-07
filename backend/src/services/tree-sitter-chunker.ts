import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Go from 'tree-sitter-go';
import Rust from 'tree-sitter-rust';
import { log } from '../utils/logger';

export interface CodeChunk {
  chunkText: string;
  startLine: number;
  endLine: number;
  chunkType: string;
  chunkName?: string;
}

/**
 * Tree-sitter based intelligent code chunker
 * Chunks code by semantic boundaries (functions, classes, etc.)
 */
export class TreeSitterChunker {
  private parsers: Map<string, Parser>;

  constructor() {
    this.parsers = new Map();
    this.initializeParsers();
  }

  private initializeParsers() {
    try {
      // JavaScript
      const jsParser = new Parser();
      jsParser.setLanguage(JavaScript as any);
      this.parsers.set('javascript', jsParser);
      this.parsers.set('js', jsParser);
      this.parsers.set('jsx', jsParser);
    } catch (err) {
      log.warn('Failed to initialize JavaScript parser:', err);
    }

    try {
      // TypeScript
      const tsParser = new Parser();
      tsParser.setLanguage((TypeScript as any).typescript);
      this.parsers.set('typescript', tsParser);
      this.parsers.set('ts', tsParser);
    } catch (err) {
      log.warn('Failed to initialize TypeScript parser:', err);
    }

    try {
      // TypeScript TSX
      const tsxParser = new Parser();
      tsxParser.setLanguage((TypeScript as any).tsx);
      this.parsers.set('tsx', tsxParser);
    } catch (err) {
      log.warn('Failed to initialize TSX parser:', err);
    }

    try {
      // Python
      const pyParser = new Parser();
      pyParser.setLanguage(Python as any);
      this.parsers.set('python', pyParser);
      this.parsers.set('py', pyParser);
    } catch (err) {
      log.warn('Failed to initialize Python parser:', err);
    }

    try {
      // Go
      const goParser = new Parser();
      goParser.setLanguage(Go as any);
      this.parsers.set('go', goParser);
    } catch (err) {
      log.warn('Failed to initialize Go parser:', err);
    }

    try {
      // Rust
      const rsParser = new Parser();
      rsParser.setLanguage(Rust as any);
      this.parsers.set('rust', rsParser);
      this.parsers.set('rs', rsParser);
    } catch (err) {
      log.warn('Failed to initialize Rust parser:', err);
    }
  }

  /**
   * Check if a language is supported
   */
  supportsLanguage(language: string): boolean {
    return this.parsers.has(language.toLowerCase());
  }

  /**
   * Chunk code using tree-sitter
   */
  async chunkCode(content: string, language: string, filePath: string): Promise<CodeChunk[]> {
    const parser = this.parsers.get(language.toLowerCase());
    if (!parser) {
      throw new Error(`Language ${language} is not supported by tree-sitter`);
    }

    try {
      const tree = parser.parse(content);
      const chunks: CodeChunk[] = [];

      // Extract top-level constructs
      const rootNode = tree.rootNode;
      const lines = content.split('\n');

      // Process each child node
      for (const node of rootNode.children) {
        const chunk = this.extractChunk(node, lines, filePath);
        if (chunk) {
          chunks.push(chunk);
        }
      }

      // If no chunks extracted (empty file or only comments), return whole file as one chunk
      if (chunks.length === 0 && content.trim().length > 0) {
        chunks.push({
          chunkText: content,
          startLine: 1,
          endLine: lines.length,
          chunkType: 'file',
          chunkName: filePath,
        });
      }

      return chunks;
    } catch (err) {
      log.error(`Tree-sitter parsing failed for ${language}:`, err);
      throw err;
    }
  }

  /**
   * Extract a chunk from a syntax node
   */
  private extractChunk(node: Parser.SyntaxNode, lines: string[], filePath: string): CodeChunk | null {
    // Skip very small nodes (like single punctuation)
    if (node.endPosition.row - node.startPosition.row < 1) {
      return null;
    }

    const startLine = node.startPosition.row + 1; // 1-indexed
    const endLine = node.endPosition.row + 1;
    const chunkText = lines.slice(node.startPosition.row, node.endPosition.row + 1).join('\n');

    // Determine chunk type and name based on node type
    let chunkType = node.type;
    let chunkName: string | undefined;

    // Extract meaningful names
    switch (node.type) {
      case 'function_declaration':
      case 'function_definition':
      case 'method_definition':
      case 'arrow_function':
        chunkType = 'function';
        chunkName = this.extractFunctionName(node);
        break;

      case 'class_declaration':
      case 'class_definition':
        chunkType = 'class';
        chunkName = this.extractClassName(node);
        break;

      case 'interface_declaration':
        chunkType = 'interface';
        chunkName = this.extractInterfaceName(node);
        break;

      case 'type_alias_declaration':
        chunkType = 'type';
        chunkName = this.extractTypeName(node);
        break;

      case 'export_statement':
      case 'import_statement':
        chunkType = 'import_export';
        break;

      default:
        // Generic code block
        chunkType = 'code_block';
    }

    if (!chunkName) {
      chunkName = `${filePath}:${startLine}-${endLine}`;
    } else {
      chunkName = `${filePath}:${chunkName}`;
    }

    return {
      chunkText: chunkText.trim(),
      startLine,
      endLine,
      chunkType,
      chunkName,
    };
  }

  /**
   * Extract function name from node
   */
  private extractFunctionName(node: Parser.SyntaxNode): string | undefined {
    // Look for identifier in children
    for (const child of node.children) {
      if (child.type === 'identifier' || child.type === 'property_identifier') {
        return child.text;
      }
    }
    return undefined;
  }

  /**
   * Extract class name from node
   */
  private extractClassName(node: Parser.SyntaxNode): string | undefined {
    for (const child of node.children) {
      if (child.type === 'type_identifier' || child.type === 'identifier') {
        return child.text;
      }
    }
    return undefined;
  }

  /**
   * Extract interface name from node
   */
  private extractInterfaceName(node: Parser.SyntaxNode): string | undefined {
    for (const child of node.children) {
      if (child.type === 'type_identifier') {
        return child.text;
      }
    }
    return undefined;
  }

  /**
   * Extract type name from node
   */
  private extractTypeName(node: Parser.SyntaxNode): string | undefined {
    for (const child of node.children) {
      if (child.type === 'type_identifier') {
        return child.text;
      }
    }
    return undefined;
  }
}

/**
 * Fallback line-based chunker
 */
export function chunkByLines(
  content: string,
  filePath: string,
  chunkSize: number = 50,
  chunkOverlap: number = 5
): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];

  for (let i = 0; i < lines.length; i += chunkSize - chunkOverlap) {
    const endLine = Math.min(i + chunkSize, lines.length);
    const chunkText = lines.slice(i, endLine).join('\n');

    if (chunkText.trim().length > 0) {
      chunks.push({
        chunkText,
        startLine: i + 1,
        endLine: endLine,
        chunkType: 'code_block',
        chunkName: `${filePath}:${i + 1}-${endLine}`,
      });
    }
  }

  return chunks;
}

/**
 * Main chunking function with fallback
 */
export async function chunkCodeWithFallback(
  content: string,
  language: string,
  filePath: string
): Promise<CodeChunk[]> {
  const chunker = new TreeSitterChunker();

  // Try tree-sitter first
  if (chunker.supportsLanguage(language)) {
    try {
      const chunks = await chunker.chunkCode(content, language, filePath);
      log.info(`✓ Tree-sitter chunked ${filePath} into ${chunks.length} semantic chunks`);

      // Print first 2 chunks as examples
    

      return chunks;
    } catch (err) {
      log.warn(`Tree-sitter failed for ${filePath}, falling back to line-based chunking:`, err);
    }
  } else {
    log.info(`Language ${language} not supported by tree-sitter, using line-based chunking for ${filePath}`);
  }

  // Fallback to line-based chunking
  const chunks = chunkByLines(content, filePath);
  log.info(`✓ Line-based chunked ${filePath} into ${chunks.length} chunks`);


  return chunks;
}
