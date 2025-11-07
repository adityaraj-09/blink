/**
 * Code Chunker - Main Export
 */

export { CodeChunker } from './codeChunker';
export type { CodeChunk } from './codeChunker';

export {
  Language,
  getLanguageFromExtension,
  getMonacoLanguage,
  CHUNK_NODE_TYPES,
  MIN_CHUNK_LINES,
  MAX_CHUNK_LINES,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from './languageConfig';
