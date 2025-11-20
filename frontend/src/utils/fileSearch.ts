/**
 * Robust File Search Utility
 * Provides fuzzy matching, path-based search, and intelligent ranking
 */

export interface FileSearchResult {
  file: {
    filePath: string;
    fileId?: string;
    name?: string;
  };
  score: number;
  matchType: 'exact' | 'path' | 'filename' | 'fuzzy' | 'contains';
  matchedParts: string[];
}

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculate similarity score (0-1) between two strings
 */
const similarity = (a: string, b: string): number => {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - (distance / maxLen);
};

/**
 * Check if search term matches in order (fuzzy substring)
 */
const fuzzySubstringMatch = (text: string, search: string): boolean => {
  const textLower = text.toLowerCase();
  const searchLower = search.toLowerCase();
  
  let searchIndex = 0;
  for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
    if (textLower[i] === searchLower[searchIndex]) {
      searchIndex++;
    }
  }
  return searchIndex === searchLower.length;
};

/**
 * Extract filename from path
 */
const getFileName = (path: string): string => {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

/**
 * Extract file extension
 */
const getFileExtension = (path: string): string => {
  const fileName = getFileName(path);
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
};

/**
 * Check if path segments match search term
 * e.g., "src/comp" matches "src/components/Button.jsx"
 */
const pathSegmentMatch = (path: string, search: string): { matched: boolean; matchedParts: string[] } => {
  const pathLower = path.toLowerCase();
  const searchLower = search.toLowerCase();
  const searchParts = searchLower.split(/[/\\]/).filter(p => p.length > 0);
  const pathParts = pathLower.split(/[/\\]/).filter(p => p.length > 0);
  
  if (searchParts.length === 0) {
    return { matched: true, matchedParts: [] };
  }
  
  const matchedParts: string[] = [];
  let searchIndex = 0;
  
  for (const pathPart of pathParts) {
    if (searchIndex < searchParts.length) {
      const searchPart = searchParts[searchIndex];
      
      // Check if this path part starts with or contains the search part
      if (pathPart.startsWith(searchPart) || pathPart.includes(searchPart)) {
        matchedParts.push(pathPart);
        searchIndex++;
      } else if (fuzzySubstringMatch(pathPart, searchPart)) {
        matchedParts.push(pathPart);
        searchIndex++;
      }
    }
  }
  
  return {
    matched: searchIndex === searchParts.length,
    matchedParts
  };
};

/**
 * Search files with robust fuzzy matching
 */
export const searchFiles = (
  files: Array<{ filePath: string; fileId?: string; name?: string }>,
  searchTerm: string,
  options: {
    maxResults?: number;
    minScore?: number;
  } = {}
): FileSearchResult[] => {
  const { maxResults = 50, minScore = 0.1 } = options;
  
  if (!searchTerm || searchTerm.trim().length === 0) {
    return files.slice(0, maxResults).map(file => ({
      file,
      score: 1.0,
      matchType: 'contains',
      matchedParts: []
    }));
  }
  
  const searchLower = searchTerm.toLowerCase().trim();
  const results: FileSearchResult[] = [];
  
  for (const file of files) {
    const filePath = file.filePath;
    const filePathLower = filePath.toLowerCase();
    const fileName = getFileName(filePath);
    const fileNameLower = fileName.toLowerCase();
    const fileExtension = getFileExtension(filePath).toLowerCase();
    
    let score = 0;
    let matchType: FileSearchResult['matchType'] = 'contains';
    let matchedParts: string[] = [];
    
    // 1. Exact match (highest priority)
    if (filePathLower === searchLower) {
      score = 1.0;
      matchType = 'exact';
      matchedParts = [filePath];
    }
    // 2. Exact filename match
    else if (fileNameLower === searchLower) {
      score = 0.95;
      matchType = 'filename';
      matchedParts = [fileName];
    }
    // 3. Path starts with search term
    else if (filePathLower.startsWith(searchLower)) {
      score = 0.9;
      matchType = 'path';
      matchedParts = [filePath.substring(0, searchLower.length)];
    }
    // 4. Filename starts with search term
    else if (fileNameLower.startsWith(searchLower)) {
      score = 0.85;
      matchType = 'filename';
      matchedParts = [fileName];
    }
    // 5. Path segment matching (e.g., "src/comp" matches "src/components/Button.jsx")
    else {
      const segmentMatch = pathSegmentMatch(filePath, searchLower);
      if (segmentMatch.matched) {
        score = 0.7 + (segmentMatch.matchedParts.length / filePath.split('/').length) * 0.15;
        matchType = 'path';
        matchedParts = segmentMatch.matchedParts;
      }
      // 6. Filename contains search term
      else if (fileNameLower.includes(searchLower)) {
        score = 0.6;
        matchType = 'filename';
        matchedParts = [fileName];
      }
      // 7. Path contains search term
      else if (filePathLower.includes(searchLower)) {
        score = 0.5;
        matchType = 'contains';
        matchedParts = [];
      }
      // 8. Fuzzy matching on filename
      else {
        const filenameSimilarity = similarity(fileNameLower, searchLower);
        if (filenameSimilarity > 0.5) {
          score = filenameSimilarity * 0.4;
          matchType = 'fuzzy';
          matchedParts = [fileName];
        }
        // 9. Fuzzy substring match
        else if (fuzzySubstringMatch(filePathLower, searchLower)) {
          score = 0.3;
          matchType = 'fuzzy';
          matchedParts = [];
        }
        // 10. Extension match (lowest priority)
        else if (fileExtension && searchLower.startsWith('.') && fileExtension === searchLower.substring(1)) {
          score = 0.2;
          matchType = 'contains';
          matchedParts = [];
        }
      }
    }
    
    // Boost score for shorter paths (prefer shorter, more direct matches)
    if (score > 0) {
      const pathLengthPenalty = Math.min(filePath.length / 100, 0.1);
      score = Math.max(0, score - pathLengthPenalty);
    }
    
    if (score >= minScore) {
      results.push({
        file,
        score,
        matchType,
        matchedParts
      });
    }
  }
  
  // Sort by score (descending), then by path length (ascending)
  results.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.01) {
      return b.score - a.score;
    }
    return a.file.filePath.length - b.file.filePath.length;
  });
  
  return results.slice(0, maxResults);
};

/**
 * Quick search for autocomplete/suggestions (faster, less accurate)
 */
export const quickSearchFiles = (
  files: Array<{ filePath: string; fileId?: string; name?: string }>,
  searchTerm: string,
  maxResults: number = 10
): Array<{ filePath: string; fileId?: string; name?: string }> => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return files.slice(0, maxResults);
  }
  
  const searchLower = searchTerm.toLowerCase().trim();
  const results = searchFiles(files, searchTerm, { maxResults, minScore: 0.2 });
  
  return results.map(r => r.file);
};

