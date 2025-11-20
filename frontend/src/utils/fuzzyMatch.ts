/**
 * Robust Fuzzy Matching Utility for Code Edits
 * 
 * Implements "Anchor-Based" locating to find where code edits should be applied,
 * tolerating line number shifts and minor formatting differences.
 */

export interface MatchResult {
  startIndex: number;
  endIndex: number;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'not_found';
}

/**
 * Normalize text for comparison:
 * - Remove leading/trailing whitespace
 * - Collapse multiple spaces/tabs into single space
 * - Ignore specific punctuation differences if needed
 */
const normalize = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' '); // Collapse all whitespace to single space
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching confidence
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
 * Locate text within a file using anchor-based search
 * 
 * @param fileContent The full content of the file
 * @param searchBlock The text we are looking for (oldCode)
 * @param hintLine The line number where AI thinks the code is (1-based)
 * @param tolerance How many lines to look around the hint (default: 50)
 */
export const locateEdit = (
  fileContent: string,
  searchBlock: string,
  hintLine?: number,
  tolerance: number = 50
): MatchResult => {
  if (!fileContent || !searchBlock) {
    return { startIndex: -1, endIndex: -1, confidence: 0, matchType: 'not_found' };
  }

  // 1. Try Exact Match
  // First, check exactly at the hint line if provided
  const lines = fileContent.split('\n');
  const searchLines = searchBlock.split('\n');
  
  // If hint provided, search outwards from there
  if (hintLine) {
    const startSearch = Math.max(0, hintLine - tolerance);
    const endSearch = Math.min(lines.length, hintLine + tolerance);
    
    // Create a sliding window search
    // This is a simplified implementation - in production might need optimization for huge files
    const normalizedSearch = normalize(searchBlock);
    
    let bestMatch: MatchResult = { startIndex: -1, endIndex: -1, confidence: 0, matchType: 'not_found' };
    let minDistance = Infinity;

    // Convert file to string indices for return values
    let currentCharIndex = 0;
    const lineIndices: number[] = [0];
    for (const line of lines) {
      currentCharIndex += line.length + 1; // +1 for newline
      lineIndices.push(currentCharIndex);
    }

    // Search locally first
    for (let i = startSearch; i < endSearch; i++) {
      // Construct potential block from file lines
      const potentialBlockLines = lines.slice(i, i + searchLines.length);
      const potentialBlock = potentialBlockLines.join('\n');
      const normalizedPotential = normalize(potentialBlock);

      // Exact string match (normalized)
      if (normalizedPotential === normalizedSearch) {
        return {
          startIndex: lineIndices[i],
          endIndex: lineIndices[i + searchLines.length] - 1, // -1 to exclude last newline
          confidence: 1.0,
          matchType: 'exact'
        };
      }

      // Fuzzy match using distance
      const distance = levenshteinDistance(normalizedPotential, normalizedSearch);
      const maxLen = Math.max(normalizedPotential.length, normalizedSearch.length);
      const similarity = 1 - (distance / maxLen);

      if (similarity > 0.8 && distance < minDistance) {
        minDistance = distance;
        bestMatch = {
          startIndex: lineIndices[i],
          endIndex: lineIndices[i + searchLines.length] - 1,
          confidence: similarity,
          matchType: 'fuzzy'
        };
      }
    }

    if (bestMatch.confidence > 0.8) {
      return bestMatch;
    }
  }

  // 2. Fallback: Global Search if local failed
  // Simple indexOf for exact non-normalized match
  const exactIndex = fileContent.indexOf(searchBlock);
  if (exactIndex !== -1) {
    return {
      startIndex: exactIndex,
      endIndex: exactIndex + searchBlock.length,
      confidence: 1.0,
      matchType: 'exact'
    };
  }

  return { startIndex: -1, endIndex: -1, confidence: 0, matchType: 'not_found' };
};

