/**
 * Language Configuration for Code Chunking
 * Defines supported languages and their chunk types
 */

export enum Language {
  TypeScript = 'TypeScript',
  JavaScript = 'JavaScript',
  Python = 'Python',
  Rust = 'Rust',
  Go = 'Go',
  Java = 'Java',
  CPP = 'C++',
  C = 'C',
  CSharp = 'C#',
  Unknown = 'Unknown',
}

/**
 * Map file extensions to languages
 */
export function getLanguageFromExtension(filePath: string): Language | null {
  const ext = filePath.split('.').pop()?.toLowerCase();

  const extensionMap: Record<string, Language> = {
    ts: Language.TypeScript,
    tsx: Language.TypeScript,
    js: Language.JavaScript,
    jsx: Language.JavaScript,
    mjs: Language.JavaScript,
    py: Language.Python,
    rs: Language.Rust,
    go: Language.Go,
    java: Language.Java,
    cpp: Language.CPP,
    cc: Language.CPP,
    cxx: Language.CPP,
    c: Language.C,
    h: Language.C,
    cs: Language.CSharp,
  };

  return extensionMap[ext || ''] || null;
}

/**
 * Get language identifier for Monaco Editor
 */
export function getMonacoLanguage(language: Language): string {
  const monacoMap: Record<Language, string> = {
    [Language.TypeScript]: 'typescript',
    [Language.JavaScript]: 'javascript',
    [Language.Python]: 'python',
    [Language.Rust]: 'rust',
    [Language.Go]: 'go',
    [Language.Java]: 'java',
    [Language.CPP]: 'cpp',
    [Language.C]: 'c',
    [Language.CSharp]: 'csharp',
    [Language.Unknown]: 'plaintext',
  };

  return monacoMap[language] || 'plaintext';
}

/**
 * Chunk node types for different languages
 * These are the AST node types we want to extract as semantic chunks
 */
export const CHUNK_NODE_TYPES: Record<Language, Set<string>> = {
  [Language.TypeScript]: new Set([
    'function_declaration',
    'method_definition',
    'class_declaration',
    'interface_declaration',
    'type_alias_declaration',
    'enum_declaration',
    'arrow_function',
  ]),
  [Language.JavaScript]: new Set([
    'function_declaration',
    'method_definition',
    'class_declaration',
    'arrow_function',
  ]),
  [Language.Python]: new Set([
    'function_definition',
    'class_definition',
    'decorated_definition',
  ]),
  [Language.Rust]: new Set([
    'function_item',
    'impl_item',
    'struct_item',
    'enum_item',
    'trait_item',
    'mod_item',
  ]),
  [Language.Go]: new Set([
    'function_declaration',
    'method_declaration',
    'type_declaration',
    'interface_declaration',
  ]),
  [Language.Java]: new Set([
    'method_declaration',
    'class_declaration',
    'interface_declaration',
    'enum_declaration',
    'constructor_declaration',
  ]),
  [Language.CPP]: new Set([
    'function_definition',
    'class_specifier',
    'struct_specifier',
    'namespace_definition',
  ]),
  [Language.C]: new Set(['function_definition', 'struct_specifier']),
  [Language.CSharp]: new Set([
    'method_declaration',
    'class_declaration',
    'interface_declaration',
    'struct_declaration',
  ]),
  [Language.Unknown]: new Set([]),
};

/**
 * Minimum and maximum chunk sizes (in lines)
 */
export const MIN_CHUNK_LINES = 3;
export const MAX_CHUNK_LINES = 500;

/**
 * Default chunk size for line-based fallback
 */
export const DEFAULT_CHUNK_SIZE = 50;
export const DEFAULT_CHUNK_OVERLAP = 10;
