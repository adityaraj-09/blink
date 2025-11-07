/**
 * Code Chunker for Frontend
 * Simple line-based chunking (tree-sitter integration can be added later)
 */

import {
  Language,
  getLanguageFromExtension,
  MIN_CHUNK_LINES,
  MAX_CHUNK_LINES,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from './languageConfig';

export interface CodeChunk {
  text: string;
  startLine: number;
  endLine: number;
  chunkType: string;
  name?: string;
  language: Language;
}

export class CodeChunker {
  /**
   * Chunk a file's content
   */
  async chunkFile(
    content: string,
    filePath: string,
    language?: Language
  ): Promise<CodeChunk[]> {
    const detectedLanguage =
      language || getLanguageFromExtension(filePath) || Language.Unknown;

    // For now, use line-based chunking
    // TODO: Add tree-sitter support for semantic chunking
    return this.lineBasedChunking(content, detectedLanguage);
  }

  /**
   * Line-based chunking with overlapping windows
   */
  private lineBasedChunking(content: string, language: Language): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];

    // If file is small, return as single chunk
    if (lines.length <= MAX_CHUNK_LINES) {
      chunks.push({
        text: content,
        startLine: 1,
        endLine: lines.length,
        chunkType: 'file',
        language,
      });
      return chunks;
    }

    // Use sliding window approach
    const windowSize = DEFAULT_CHUNK_SIZE;
    const overlap = DEFAULT_CHUNK_OVERLAP;

    for (let i = 0; i < lines.length; i += windowSize - overlap) {
      const startLine = i + 1;
      const endLine = Math.min(i + windowSize, lines.length);
      const chunkLines = lines.slice(i, endLine);
      const text = chunkLines.join('\n');

      // Skip empty chunks
      if (text.trim().length === 0) {
        continue;
      }

      // Skip very small chunks at the end
      if (chunkLines.length < MIN_CHUNK_LINES && i > 0) {
        continue;
      }

      chunks.push({
        text,
        startLine,
        endLine,
        chunkType: 'window',
        language,
      });
    }

    return chunks;
  }

  /**
   * Smart chunking based on code structure (simple heuristic-based)
   */
  private smartChunking(content: string, language: Language): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];

    // Try to detect functions/classes using simple patterns
    const patterns = this.getLanguagePatterns(language);
    let currentChunk: { startLine: number; lines: string[]; name?: string } | null =
      null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if line matches function/class pattern
      let matchedPattern = false;
      let chunkName: string | undefined;

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          matchedPattern = true;
          chunkName = match[1];
          break;
        }
      }

      if (matchedPattern) {
        // Save previous chunk if exists
        if (currentChunk && currentChunk.lines.length >= MIN_CHUNK_LINES) {
          chunks.push({
            text: currentChunk.lines.join('\n'),
            startLine: currentChunk.startLine,
            endLine: currentChunk.startLine + currentChunk.lines.length - 1,
            chunkType: 'function',
            name: currentChunk.name,
            language,
          });
        }

        // Start new chunk
        currentChunk = {
          startLine: i + 1,
          lines: [lines[i]],
          name: chunkName,
        };
      } else if (currentChunk) {
        // Add to current chunk
        currentChunk.lines.push(lines[i]);

        // Check if chunk is getting too large
        if (currentChunk.lines.length >= MAX_CHUNK_LINES) {
          chunks.push({
            text: currentChunk.lines.join('\n'),
            startLine: currentChunk.startLine,
            endLine: currentChunk.startLine + currentChunk.lines.length - 1,
            chunkType: 'function',
            name: currentChunk.name,
            language,
          });
          currentChunk = null;
        }
      }
    }

    // Save last chunk
    if (currentChunk && currentChunk.lines.length >= MIN_CHUNK_LINES) {
      chunks.push({
        text: currentChunk.lines.join('\n'),
        startLine: currentChunk.startLine,
        endLine: currentChunk.startLine + currentChunk.lines.length - 1,
        chunkType: 'function',
        name: currentChunk.name,
        language,
      });
    }

    // Fallback to line-based if no chunks found
    if (chunks.length === 0) {
      return this.lineBasedChunking(content, language);
    }

    return chunks;
  }

  /**
   * Get regex patterns for detecting functions/classes
   */
  private getLanguagePatterns(language: Language): Array<{ regex: RegExp }> {
    switch (language) {
      case Language.TypeScript:
      case Language.JavaScript:
        return [
          { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
          { regex: /^(?:export\s+)?class\s+(\w+)/ },
          { regex: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/ },
          { regex: /^(?:export\s+)?interface\s+(\w+)/ },
        ];

      case Language.Python:
        return [
          { regex: /^def\s+(\w+)/ },
          { regex: /^class\s+(\w+)/ },
          { regex: /^async\s+def\s+(\w+)/ },
        ];

      case Language.Rust:
        return [
          { regex: /^(?:pub\s+)?fn\s+(\w+)/ },
          { regex: /^(?:pub\s+)?struct\s+(\w+)/ },
          { regex: /^(?:pub\s+)?enum\s+(\w+)/ },
          { regex: /^impl(?:\s+\w+)?\s+for\s+(\w+)/ },
        ];

      case Language.Go:
        return [
          { regex: /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/ },
          { regex: /^type\s+(\w+)\s+struct/ },
          { regex: /^type\s+(\w+)\s+interface/ },
        ];

      case Language.Java:
      case Language.CSharp:
        return [
          { regex: /^(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(?:\w+\s+)?(\w+)\s*\(/ },
          { regex: /^(?:public|private|protected)?\s*class\s+(\w+)/ },
          { regex: /^(?:public|private|protected)?\s*interface\s+(\w+)/ },
        ];

      default:
        return [];
    }
  }

  /**
   * Chunk multiple files
   */
  async chunkFiles(
    files: Array<{ path: string; content: string; language?: Language }>
  ): Promise<Map<string, CodeChunk[]>> {
    const results = new Map<string, CodeChunk[]>();

    for (const file of files) {
      try {
        const chunks = await this.chunkFile(file.content, file.path, file.language);
        results.set(file.path, chunks);
      } catch (err) {
        console.error(`Error chunking ${file.path}:`, err);
        results.set(file.path, []);
      }
    }

    return results;
  }
}
