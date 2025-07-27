// supabase/functions/diff-analyzer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Redis } from "https://esm.sh/@upstash/redis@latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize Upstash Redis client
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_URL") ?? "",
  token: Deno.env.get("UPSTASH_REDIS_TOKEN") ?? "",
});

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

interface TextAnalysis {
  wordSimilarity: number;
  characterSimilarity: number;
  hasAbbreviationExpansion: boolean;
  hasCleanWordChanges: boolean;
  hasPunctuationOnlyChanges: boolean;
  hasNumberUnitChanges: boolean;
  hasWordReplacements: boolean;
  changeRatio: number;
}

// Helper function to create cache key
function createCacheKey(oldText: string, newText: string): string {
  const combined = `${oldText}|||${newText}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
  }
  
  return `diff:${Math.abs(hash).toString(36)}`;
}

// Diff algorithm functions (moved from client-side)
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

function buildDiffFromLCS(oldText: string, newText: string, lcs: number[][]): DiffSegment[] {
  const segments: DiffSegment[] = [];
  let i = oldText.length;
  let j = newText.length;

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

  operations.reverse();

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

function createCharacterDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  if (oldText === '') {
    return [{ type: 'added', text: newText }];
  }

  if (newText === '') {
    return [{ type: 'removed', text: oldText }];
  }

  const lcs = longestCommonSubsequence(oldText, newText);
  return buildDiffFromLCS(oldText, newText, lcs);
}

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

function createWordDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  const oldTokens = oldText.split(/(\s+)/);
  const newTokens = newText.split(/(\s+)/);
  
  const lcs = longestCommonSubsequenceTokens(oldTokens, newTokens);
  return buildDiffFromTokenLCS(oldTokens, newTokens, lcs);
}

// Analysis functions
function calculateWordSimilarity(oldWords: string[], newWords: string[]): number {
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);
  const intersection = new Set([...oldSet].filter(w => newSet.has(w)));
  const union = new Set([...oldSet, ...newWords]);
  
  return union.size === 0 ? 1 : intersection.size / union.size;
}

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

function calculateCharacterSimilarity(oldText: string, newText: string): number {
  const maxLength = Math.max(oldText.length, newText.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(oldText, newText);
  return 1 - (distance / maxLength);
}

function isAbbreviationExpansion(oldWord: string, newWord: string): boolean {
  if (oldWord.length >= newWord.length || oldWord.length > 4) return false;
  if (oldWord[0].toLowerCase() !== newWord[0].toLowerCase()) return false;
  
  const abbreviations: Record<string, string[]> = {
    'dgn': ['dengan'],
    'yg': ['yang'], 
    'utk': ['untuk'],
    'sbg': ['sebagai'],
    'dlm': ['dalam'],
    'dr': ['dari'],
    'pd': ['pada'],
    'tdk': ['tidak'],
    'hrs': ['harus'],
    'krn': ['karena'],
    'sdh': ['sudah'],
    'blm': ['belum']
  };
  
  const oldLower = oldWord.toLowerCase();
  const newLower = newWord.toLowerCase();
  
  if (abbreviations[oldLower]?.includes(newLower)) {
    return true;
  }
  
  if (oldWord.length <= 3) {
    let oldIndex = 0;
    for (let j = 0; j < newWord.length && oldIndex < oldWord.length; j++) {
      if (newWord[j].toLowerCase() === oldWord[oldIndex].toLowerCase()) {
        oldIndex++;
      }
    }
    return oldIndex === oldWord.length;
  }
  
  return false;
}

function detectAbbreviationExpansion(oldWords: string[], newWords: string[]): boolean {
  for (let i = 0; i < Math.min(oldWords.length, newWords.length); i++) {
    const oldWord = oldWords[i];
    const newWord = newWords[i];
    
    if (isAbbreviationExpansion(oldWord, newWord)) {
      return true;
    }
  }
  
  return false;
}

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

function detectCleanWordChanges(oldWords: string[], newWords: string[]): boolean {
  const lcs = longestCommonSubsequenceWords(oldWords, newWords);
  const commonWords = lcs.length;
  const totalWords = Math.max(oldWords.length, newWords.length);
  
  return commonWords / totalWords > 0.5;
}

function detectPunctuationOnlyChanges(oldText: string, newText: string): boolean {
  const oldWithoutPunc = oldText.replace(/[^\w\s]/g, '');
  const newWithoutPunc = newText.replace(/[^\w\s]/g, '');
  
  if (oldWithoutPunc === newWithoutPunc) {
    return true;
  }
  
  const similarity = calculateCharacterSimilarity(oldWithoutPunc, newWithoutPunc);
  return similarity > 0.95;
}

function detectNumberUnitChanges(oldWords: string[], newWords: string[]): boolean {
  const numberUnitPattern = /^\d+(\.\d+)?(mg|g|kg|ml|l|cm|mm|m|%|°c|°f)?$/i;
  
  for (let i = 0; i < Math.min(oldWords.length, newWords.length); i++) {
    const oldWord = oldWords[i];
    const newWord = newWords[i];
    
    if (numberUnitPattern.test(oldWord) && numberUnitPattern.test(newWord) && oldWord !== newWord) {
      return true;
    }
  }
  
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

function detectWordReplacements(oldWords: string[], newWords: string[]): boolean {
  if (oldWords.length !== newWords.length) return false;
  
  let replacements = 0;
  for (let i = 0; i < oldWords.length; i++) {
    const oldWord = oldWords[i];
    const newWord = newWords[i];
    
    if (oldWord !== newWord) {
      if (isAbbreviationExpansion(oldWord, newWord)) continue;
      
      const numberUnitPattern = /^\d+(\.\d+)?(mg|g|kg|ml|l|cm|mm|m|%|°c|°f)?$/i;
      if (numberUnitPattern.test(oldWord) && numberUnitPattern.test(newWord)) continue;
      
      const similarity = calculateCharacterSimilarity(oldWord, newWord);
      if (similarity < 0.5) {
        replacements++;
      }
    }
  }
  
  return replacements > 0 && replacements <= oldWords.length / 2;
}

function analyzeTextChanges(oldText: string, newText: string): TextAnalysis {
  const oldWords = oldText.split(/\s+/).filter(w => w.length > 0);
  const newWords = newText.split(/\s+/).filter(w => w.length > 0);
  
  const wordSimilarity = calculateWordSimilarity(oldWords, newWords);
  const characterSimilarity = calculateCharacterSimilarity(oldText, newText);
  const hasAbbreviationExpansion = detectAbbreviationExpansion(oldWords, newWords);
  const hasCleanWordChanges = detectCleanWordChanges(oldWords, newWords);
  const hasPunctuationOnlyChanges = detectPunctuationOnlyChanges(oldText, newText);
  const hasNumberUnitChanges = detectNumberUnitChanges(oldWords, newWords);
  const hasWordReplacements = detectWordReplacements(oldWords, newWords);
  
  const changeRatio = Math.abs(oldText.length - newText.length) / Math.max(oldText.length, newText.length);
  
  return {
    wordSimilarity,
    characterSimilarity,
    hasAbbreviationExpansion,
    hasCleanWordChanges,
    hasPunctuationOnlyChanges,
    hasNumberUnitChanges,
    hasWordReplacements,
    changeRatio
  };
}

function createSmartDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  const analysis = analyzeTextChanges(oldText, newText);
  
  if (analysis.hasAbbreviationExpansion || analysis.hasPunctuationOnlyChanges) {
    return createCharacterDiff(oldText, newText);
  }
  
  if (analysis.hasNumberUnitChanges || analysis.hasWordReplacements) {
    return createWordDiff(oldText, newText);
  }
  
  if (analysis.hasCleanWordChanges && analysis.wordSimilarity > 0.6) {
    return createWordDiff(oldText, newText);
  }
  
  if (analysis.characterSimilarity > 0.80) {
    return createCharacterDiff(oldText, newText);
  } else {
    return createWordDiff(oldText, newText);
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  console.log(`🚀 Diff analyzer request: ${req.method} ${req.url}`);

  try {
    const url = new URL(req.url);
    const method = req.method;

    // POST /diff-analyzer - Analyze text differences
    if (method === "POST" && url.pathname.endsWith("/diff-analyzer")) {
      const startTime = Date.now();
      
      try {
        const { oldText, newText } = await req.json();
        
        if (typeof oldText !== 'string' || typeof newText !== 'string') {
          return new Response(
            JSON.stringify({
              error: "Invalid input: oldText and newText must be strings",
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        // Create cache key
        const cacheKey = createCacheKey(oldText, newText);
        
        // Try to get from Redis cache first
        let result: DiffSegment[] | null = null;
        let fromCache = false;
        
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            result = cached as DiffSegment[];
            fromCache = true;
            console.log(`✅ Cache hit for key: ${cacheKey}`);
          }
        } catch (cacheError) {
          console.warn(`⚠️ Redis cache error: ${cacheError.message}`);
          // Continue without cache if Redis fails
        }

        // Compute diff if not in cache
        if (!result) {
          console.log(`🔄 Computing diff for cache key: ${cacheKey}`);
          result = createSmartDiff(oldText, newText);
          
          // Store in Redis cache with 1 hour TTL
          try {
            await redis.setex(cacheKey, 3600, result);
            console.log(`💾 Cached result for key: ${cacheKey}`);
          } catch (cacheError) {
            console.warn(`⚠️ Failed to cache result: ${cacheError.message}`);
            // Continue without caching if Redis fails
          }
        }

        const processingTime = Date.now() - startTime;
        
        console.log(
          `✅ Diff completed in ${processingTime}ms ${fromCache ? '(cached)' : '(computed)'}`
        );

        return new Response(
          JSON.stringify({
            segments: result,
            analysis: analyzeTextChanges(oldText, newText),
            meta: {
              processingTime,
              fromCache,
              cacheKey: cacheKey.substring(0, 16) + '...' // Partial key for debugging
            }
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (error) {
        console.error("❌ Failed to analyze diff:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to analyze diff",
            details: error.message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    console.log(`❓ Unknown endpoint: ${method} ${url.pathname}`);
    return new Response(
      JSON.stringify({
        error: "Endpoint not found",
        method: method,
        pathname: url.pathname,
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});