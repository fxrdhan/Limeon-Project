export interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

/**
 * Creates a character-level diff using LCS algorithm
 * Pure implementation for analysis
 */
export function createCharacterDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  if (oldText === '') {
    return [{ type: 'added', text: newText }];
  }

  if (newText === '') {
    return [{ type: 'removed', text: oldText }];
  }

  // Use LCS-based approach for character diff
  const lcs = longestCommonSubsequence(oldText, newText);
  return buildDiffFromLCS(oldText, newText, lcs);
}

/**
 * Compute Longest Common Subsequence using dynamic programming
 */
function longestCommonSubsequence(text1: string, text2: string): number[][] {
  const m = text1.length;
  const n = text2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Build diff segments from LCS matrix
 */
function buildDiffFromLCS(oldText: string, newText: string, lcs: number[][]): DiffSegment[] {
  const segments: DiffSegment[] = [];
  let i = oldText.length;
  let j = newText.length;

  // Build segments by backtracking through LCS matrix
  const operations: Array<{ type: 'unchanged' | 'added' | 'removed', char: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      operations.push({ type: 'unchanged', char: oldText[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      operations.push({ type: 'added', char: newText[j - 1] });
      j--;
    } else if (i > 0) {
      operations.push({ type: 'removed', char: oldText[i - 1] });
      i--;
    }
  }

  // Reverse to get correct order
  operations.reverse();

  // Merge consecutive operations of the same type
  for (let k = 0; k < operations.length; k++) {
    const op = operations[k];
    
    if (segments.length === 0 || segments[segments.length - 1].type !== op.type) {
      segments.push({ type: op.type, text: op.char });
    } else {
      segments[segments.length - 1].text += op.char;
    }
  }

  return segments.filter(segment => segment.text.length > 0);
}

/**
 * Smart adaptive diff that chooses between character and word level based on context
 */
export function createSmartDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  const analysis = analyzeTextChanges(oldText, newText);
  
  // Decision logic based on analysis (improved)
  if (analysis.hasAbbreviationExpansion || analysis.hasPunctuationOnlyChanges) {
    return createCharacterDiff(oldText, newText);
  }
  
  // Numbers, units, and word replacements work better with word-level
  if (analysis.hasNumberUnitChanges || analysis.hasWordReplacements) {
    return createWordDiff(oldText, newText);
  }
  
  if (analysis.hasCleanWordChanges && analysis.wordSimilarity > 0.6) {
    return createWordDiff(oldText, newText);
  }
  
  // For single words with very minor character-level changes (like typos)
  const isSingleWord = !oldText.includes(' ') && !newText.includes(' ');
  const lengthDiff = Math.abs(oldText.length - newText.length);
  
  // Special case: Repeated character corrections (e.g., "ampulll" -> "ampul")
  if (analysis.hasRepeatedCharCorrection) {
    return createCharacterDiff(oldText, newText);
  }
  
  // Only use character diff for single words if:
  // 1. Small length difference (≤2 chars)
  // 2. High character similarity (≥0.8) - indicates minor edit, not word replacement
  // 3. Not detected as number/unit change or word replacement
  if (isSingleWord && lengthDiff <= 2 && analysis.characterSimilarity >= 0.8 && 
      !analysis.hasNumberUnitChanges && !analysis.hasWordReplacements) {
    return createCharacterDiff(oldText, newText);
  }
  
  // For high character similarity, use character diff
  if (analysis.characterSimilarity > 0.8) {
    return createCharacterDiff(oldText, newText);
  } else {
    return createWordDiff(oldText, newText);
  }
}

interface TextAnalysis {
  wordSimilarity: number;
  characterSimilarity: number;
  hasAbbreviationExpansion: boolean;
  hasCleanWordChanges: boolean;
  hasPunctuationOnlyChanges: boolean;
  hasNumberUnitChanges: boolean;
  hasWordReplacements: boolean;
  hasRepeatedCharCorrection: boolean;
  changeRatio: number;
}

/**
 * Analyze the nature of changes between two texts
 */
function analyzeTextChanges(oldText: string, newText: string): TextAnalysis {
  const oldWords = oldText.split(/\s+/).filter(w => w.length > 0);
  const newWords = newText.split(/\s+/).filter(w => w.length > 0);
  
  // Calculate similarities
  const wordSimilarity = calculateWordSimilarity(oldWords, newWords);
  const characterSimilarity = calculateCharacterSimilarity(oldText, newText);
  
  // Detect various change patterns
  const hasAbbreviationExpansion = detectAbbreviationExpansion(oldWords, newWords);
  const hasCleanWordChanges = detectCleanWordChanges(oldWords, newWords);
  const hasPunctuationOnlyChanges = detectPunctuationOnlyChanges(oldText, newText);
  const hasNumberUnitChanges = detectNumberUnitChanges(oldWords, newWords);
  const hasWordReplacements = detectWordReplacements(oldWords, newWords);
  const hasRepeatedCharCorrection = detectRepeatedCharCorrection(oldText, newText);
  
  const changeRatio = Math.abs(oldText.length - newText.length) / Math.max(oldText.length, newText.length);
  
  return {
    wordSimilarity,
    characterSimilarity,
    hasAbbreviationExpansion,
    hasCleanWordChanges,
    hasPunctuationOnlyChanges,
    hasNumberUnitChanges,
    hasWordReplacements,
    hasRepeatedCharCorrection,
    changeRatio
  };
}

/**
 * Calculate word-level similarity using Jaccard index
 */
function calculateWordSimilarity(oldWords: string[], newWords: string[]): number {
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);
  const intersection = new Set([...oldSet].filter(w => newSet.has(w)));
  const union = new Set([...oldSet, ...newSet]);
  
  return union.size === 0 ? 1 : intersection.size / union.size;
}

/**
 * Calculate character-level similarity
 */
function calculateCharacterSimilarity(oldText: string, newText: string): number {
  const maxLength = Math.max(oldText.length, newText.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(oldText, newText);
  return 1 - (distance / maxLength);
}

/**
 * Simple Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Detect abbreviation expansions (e.g., "dgn" -> "dengan")
 * More conservative - only checks same position words and exact abbreviations
 */
function detectAbbreviationExpansion(oldWords: string[], newWords: string[]): boolean {
  // Only check word pairs at same positions
  for (let i = 0; i < Math.min(oldWords.length, newWords.length); i++) {
    const oldWord = oldWords[i];
    const newWord = newWords[i];
    
    if (isAbbreviationExpansion(oldWord, newWord)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a single word pair represents abbreviation expansion
 */
function isAbbreviationExpansion(oldWord: string, newWord: string): boolean {
  // Must be short -> long expansion
  if (oldWord.length >= newWord.length || oldWord.length > 4) return false;
  
  // Must start with same letter
  if (oldWord[0].toLowerCase() !== newWord[0].toLowerCase()) return false;
  
  // Common Indonesian abbreviations (exact matches only for reliability)
  const abbreviations: Record<string, string[]> = {
    'dgn': ['dengan'],
    'yg': ['yang'], 
    'utk': ['untuk'],
    'sbg': ['sebagai'],
    'dlm': ['dalam'],
    'dr': ['dari'],  // Removed 'dokter' to avoid false positives
    'pd': ['pada'],
    'tdk': ['tidak'],
    'hrs': ['harus'],
    'krn': ['karena'],
    'sdh': ['sudah'],
    'blm': ['belum']
  };
  
  const oldLower = oldWord.toLowerCase();
  const newLower = newWord.toLowerCase();
  
  // Prioritize exact abbreviation matches
  if (abbreviations[oldLower]?.includes(newLower)) {
    return true;
  }
  
  // Only allow letter-in-sequence for very short abbreviations (≤3 chars)
  if (oldWord.length <= 3) {
    let oldIndex = 0;
    for (let j = 0; j < newWord.length && oldIndex < oldWord.length; j++) {
      if (newWord[j].toLowerCase() === oldWord[oldIndex].toLowerCase()) {
        oldIndex++;
      }
    }
    // All letters must match for short abbreviations
    return oldIndex === oldWord.length;
  }
  
  return false;
}

/**
 * Detect clean word-level changes (whole words added/removed cleanly)
 */
function detectCleanWordChanges(oldWords: string[], newWords: string[]): boolean {
  // Use LCS on word level to see if changes are clean insertions/deletions
  const lcs = longestCommonSubsequenceWords(oldWords, newWords);
  const commonWords = lcs.length;
  const totalWords = Math.max(oldWords.length, newWords.length);
  
  // If most words are preserved and changes are at word boundaries
  // Lowered threshold to 0.5 for better detection
  return commonWords / totalWords > 0.5;
}

/**
 * Detect if changes are primarily punctuation (commas, periods, etc.)
 */
function detectPunctuationOnlyChanges(oldText: string, newText: string): boolean {
  // Remove all punctuation and compare
  const oldWithoutPunc = oldText.replace(/[^\w\s]/g, '');
  const newWithoutPunc = newText.replace(/[^\w\s]/g, '');
  
  // If texts are identical without punctuation, it's punctuation-only change
  if (oldWithoutPunc === newWithoutPunc) {
    return true;
  }
  
  // Calculate how much differs when ignoring punctuation
  const similarity = calculateCharacterSimilarity(oldWithoutPunc, newWithoutPunc);
  return similarity > 0.95;
}

/**
 * Detect changes in numbers or units (e.g., "500mg" -> "250mg")
 */
function detectNumberUnitChanges(oldWords: string[], newWords: string[]): boolean {
  // Pattern for numbers with optional units
  const numberUnitPattern = /^\d+(\.\d+)?(mg|g|kg|ml|l|cm|mm|m|%|°c|°f)?$/i;
  
  for (let i = 0; i < Math.min(oldWords.length, newWords.length); i++) {
    const oldWord = oldWords[i];
    const newWord = newWords[i];
    
    // If both words are number+unit patterns but different values
    if (numberUnitPattern.test(oldWord) && numberUnitPattern.test(newWord) && oldWord !== newWord) {
      return true;
    }
  }
  
  // Also check for pure number changes
  const pureNumberPattern = /^\d+(\.\d+)?$/;
  for (let i = 0; i < Math.min(oldWords.length, newWords.length); i++) {
    const oldWord = oldWords[i];
    const newWord = newWords[i];
    
    if (pureNumberPattern.test(oldWord) && pureNumberPattern.test(newWord) && oldWord !== newWord) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect word replacements (e.g., "putih" -> "merah", "bahan" -> "zat")
 * When whole words are replaced with completely different words
 */
function detectWordReplacements(oldWords: string[], newWords: string[]): boolean {
  if (oldWords.length !== newWords.length) return false;
  
  let replacements = 0;
  for (let i = 0; i < oldWords.length; i++) {
    const oldWord = oldWords[i];
    const newWord = newWords[i];
    
    if (oldWord !== newWord) {
      // Skip if it's an abbreviation expansion or number change
      if (isAbbreviationExpansion(oldWord, newWord)) continue;
      
      const numberUnitPattern = /^\d+(\.\d+)?(mg|g|kg|ml|l|cm|mm|m|%|°c|°f)?$/i;
      if (numberUnitPattern.test(oldWord) && numberUnitPattern.test(newWord)) continue;
      
      // Check if words are completely different (low character similarity)
      const similarity = calculateCharacterSimilarity(oldWord, newWord);
      if (similarity < 0.5) {
        replacements++;
      }
    }
  }
  
  // If there are word replacements but overall structure is similar
  return replacements > 0 && replacements <= oldWords.length / 2;
}

/**
 * Detect repeated character corrections (e.g., "ampulll" -> "ampul")
 * Identifies when the old text has 3+ consecutive identical characters
 * that are reduced to 1-2 characters in the new text
 */
function detectRepeatedCharCorrection(oldText: string, newText: string): boolean {
  // Only for single words
  if (oldText.includes(' ') || newText.includes(' ')) return false;
  
  // Check if old text has repeated characters (3+ consecutive)
  const repeatedChars = findRepeatedCharacters(oldText);
  if (repeatedChars.length === 0) return false;
  
  // Check if new text doesn't have the same repeated characters
  const newRepeatedChars = findRepeatedCharacters(newText);
  if (newRepeatedChars.length > 0) return false;
  
  // Try to generate new text by reducing repeated chars from old text
  const correctedText = oldText;
  
  for (const repeated of repeatedChars) {
    const pattern = new RegExp(`${escapeRegex(repeated.char)}{3,}`, 'g');
    
    // Try reducing to 1 character
    const candidate1 = correctedText.replace(pattern, repeated.char);
    if (candidate1 === newText) return true;
    
    // Try reducing to 2 characters (for legitimate doubles)
    const candidate2 = correctedText.replace(pattern, repeated.char.repeat(2));
    if (candidate2 === newText) return true;
  }
  
  return false;
}

/**
 * Find characters that repeat 3+ times consecutively
 */
function findRepeatedCharacters(text: string): Array<{ char: string; count: number; position: number }> {
  const repeated: Array<{ char: string; count: number; position: number }> = [];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let count = 1;
    let j = i + 1;
    
    // Count consecutive same characters
    while (j < text.length && text[j] === char) {
      count++;
      j++;
    }
    
    // If found 3+ consecutive same chars
    if (count >= 3) {
      repeated.push({ char, count, position: i });
      i = j - 1; // Skip to end of repeated sequence
    }
  }
  
  return repeated;
}

/**
 * Escape special regex characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * LCS for word arrays
 */
function longestCommonSubsequenceWords(words1: string[], words2: string[]): string[] {
  const m = words1.length;
  const n = words2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find actual LCS
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (words1[i - 1] === words2[j - 1]) {
      result.unshift(words1[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return result;
}

/**
 * Creates a word-level diff between two strings using LCS
 * Better for longer texts where character-level might be too granular
 */
export function createWordDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  // Split preserving whitespace
  const oldTokens = oldText.split(/(\s+)/);
  const newTokens = newText.split(/(\s+)/);
  
  // Use LCS approach for word-level diff
  const lcs = longestCommonSubsequenceTokens(oldTokens, newTokens);
  return buildDiffFromTokenLCS(oldTokens, newTokens, lcs);
}

/**
 * LCS for token arrays (words + whitespace)
 */
function longestCommonSubsequenceTokens(tokens1: string[], tokens2: string[]): number[][] {
  const m = tokens1.length;
  const n = tokens2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokens1[i - 1] === tokens2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Build diff segments from token LCS matrix
 */
function buildDiffFromTokenLCS(oldTokens: string[], newTokens: string[], lcs: number[][]): DiffSegment[] {
  const segments: DiffSegment[] = [];
  let i = oldTokens.length;
  let j = newTokens.length;

  const operations: Array<{ type: 'unchanged' | 'added' | 'removed', token: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      operations.push({ type: 'unchanged', token: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      operations.push({ type: 'added', token: newTokens[j - 1] });
      j--;
    } else if (i > 0) {
      operations.push({ type: 'removed', token: oldTokens[i - 1] });
      i--;
    }
  }

  operations.reverse();

  // Merge consecutive operations of the same type
  for (let k = 0; k < operations.length; k++) {
    const op = operations[k];
    
    if (segments.length === 0 || segments[segments.length - 1].type !== op.type) {
      segments.push({ type: op.type, text: op.token });
    } else {
      segments[segments.length - 1].text += op.token;
    }
  }

  return segments.filter(segment => segment.text.length > 0);
}