import { describe, expect, it } from 'vite-plus/test';
import {
  getSingleSupabaseRelation,
  getSupabaseRelationName,
} from './supabaseRelations';

describe('supabase relation helpers', () => {
  it('returns the first relation from arrays', () => {
    expect(getSingleSupabaseRelation([{ id: 'one' }, { id: 'two' }])).toEqual({
      id: 'one',
    });
  });

  it('returns single relation objects unchanged', () => {
    const relation = { id: 'one' };

    expect(getSingleSupabaseRelation(relation)).toBe(relation);
  });

  it('returns null for empty or missing relations', () => {
    expect(getSingleSupabaseRelation([])).toBeNull();
    expect(getSingleSupabaseRelation(null)).toBeNull();
    expect(getSingleSupabaseRelation(undefined)).toBeNull();
  });

  it('reads relation names with a fallback', () => {
    expect(getSupabaseRelationName([{ name: 'Supplier A' }], 'Fallback')).toBe(
      'Supplier A'
    );
    expect(getSupabaseRelationName([], 'Fallback')).toBe('Fallback');
  });
});
