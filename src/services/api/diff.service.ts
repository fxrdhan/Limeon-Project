import { supabase } from '@/lib/supabase';

export interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

export interface TextAnalysis {
  wordSimilarity: number;
  characterSimilarity: number;
  hasAbbreviationExpansion: boolean;
  hasCleanWordChanges: boolean;
  hasPunctuationOnlyChanges: boolean;
  hasNumberUnitChanges: boolean;
  hasWordReplacements: boolean;
  changeRatio: number;
}

export interface DiffAnalysisResult {
  segments: DiffSegment[];
  analysis: TextAnalysis;
  meta: {
    processingTime: number;
    fromCache: boolean;
    cacheKey: string;
  };
}

export interface DiffAnalysisRequest {
  oldText: string;
  newText: string;
}

/**
 * Analyze text differences using the server-side diff analyzer
 */
export async function analyzeDiff(oldText: string, newText: string): Promise<DiffAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke('diff-analyzer', {
      body: {
        oldText,
        newText,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Diff analysis failed: ${error.message}`);
    }

    if (!data || !data.segments) {
      throw new Error('Invalid response from diff analyzer');
    }

    return data as DiffAnalysisResult;
  } catch (error) {
    console.error('Failed to analyze diff:', error);
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Diff analysis service error: ${error.message}`);
    } else {
      throw new Error('Unknown error occurred during diff analysis');
    }
  }
}

/**
 * Check if diff analyzer service is available
 */
export async function checkDiffServiceHealth(): Promise<boolean> {
  try {
    // Simple test with identical strings (should be fast)
    const result = await analyzeDiff('test', 'test');
    return result.segments.length === 1 && result.segments[0].type === 'unchanged';
  } catch (error) {
    console.warn('Diff service health check failed:', error);
    return false;
  }
}