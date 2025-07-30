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
 * Analyze text differences using server-only computation
 * ❌ NO fallback - pure server dependency for IP protection
 */
export async function analyzeDiff(oldText: string, newText: string): Promise<DiffAnalysisResult> {
  // Input validation
  if (!oldText || !newText || typeof oldText !== 'string' || typeof newText !== 'string') {
    throw new Error('Invalid input: both oldText and newText must be non-empty strings');
  }

  try {
    const { data, error } = await supabase.functions.invoke('diff-analyzer', {
      body: { oldText, newText },
    });

    if (error) {
      console.error('Server computation error:', error);
      throw new Error(`Server computation failed: ${error.message}`);
    }

    if (!data || !data.segments || !Array.isArray(data.segments)) {
      console.error('Invalid server response:', data);
      throw new Error('Invalid response from computation server');
    }

    // Validate segments structure
    const isValidSegments = data.segments.every((segment: any) => 
      segment && 
      typeof segment === 'object' && 
      typeof segment.type === 'string' && 
      ['unchanged', 'added', 'removed'].includes(segment.type) &&
      typeof segment.text === 'string'
    );

    if (!isValidSegments) {
      throw new Error('Invalid segment structure from server');
    }

    return data as DiffAnalysisResult;
    
  } catch (error) {
    console.error('Diff analysis failed:', error);
    
    // ❌ NO fallback computation - throw error for client to handle
    if (error instanceof Error) {
      throw new Error(`Computation service unavailable: ${error.message}`);
    } else {
      throw new Error('Computation service unavailable: Unknown error');
    }
  }
}

// ❌ REMOVED: checkDiffServiceHealth - tidak diperlukan untuk server-only approach
// Service health monitoring dilakukan di server-side edge function