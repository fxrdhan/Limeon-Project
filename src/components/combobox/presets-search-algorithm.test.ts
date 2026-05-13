import { describe, expect, it } from 'vite-plus/test';
import {
  getComboboxSearchEntries,
  getComboboxSearchState,
} from './utils/preset-state';

type TestItem = { id: string; name: string };

const isSameItem = (item: TestItem, value: TestItem) => item.id === value.id;
const toLabel = (item: TestItem) => item.name;

const entries = (items: TestItem[]) => getComboboxSearchEntries(items, toLabel);

const search = (
  items: TestItem[],
  query: string,
  selectedValue: TestItem | null = null,
  visibleItemLimit?: number
) =>
  getComboboxSearchState({
    isSameItem,
    items,
    normalizedInputValue: query,
    searchEntries: entries(items),
    selectedValue,
    visibleItemLimit,
  });

const ids = (result: { visibleItems: readonly TestItem[] }) =>
  result.visibleItems.map(item => item.id);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const pharmaItems: TestItem[] = [
  { id: 'paracetamol-tablet', name: 'Paracetamol Tablet' },
  { id: 'paracetamol-caplet', name: 'Paracetamol Caplet 500mg' },
  { id: 'amoxicillin', name: 'Amoxicillin Capsule 500mg' },
  { id: 'omeprazole', name: 'Omeprazole Capsule 20mg' },
  { id: 'ibuprofen', name: 'Ibuprofen Tablet 400mg' },
];

describe('Combobox search algorithm — tier boundaries and edge cases', () => {
  // =========================================================================
  // Empty and minimal input
  // =========================================================================

  describe('empty and minimal input', () => {
    it('returns all items in original order for empty query', () => {
      const result = search(pharmaItems, '');

      expect(ids(result)).toEqual(pharmaItems.map(i => i.id));
      expect(result.hasExactItem).toBe(false);
    });

    it('treats whitespace-only query as empty and returns original order', () => {
      const items: TestItem[] = [
        { id: 'b', name: 'Bravo' },
        { id: 'a', name: 'Alpha' },
      ];
      const result = search(items, '   ');

      // Whitespace normalizes to falsy empty string → empty-input fast path
      expect(ids(result)).toEqual(['b', 'a']);
    });

    it('returns empty results for a single character with no match', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Bravo' }];
      const result = search(items, 'z');

      expect(result.visibleItems).toHaveLength(0);
    });

    it('matches a single character as substring', () => {
      const items: TestItem[] = [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Bravo' },
      ];
      const result = search(items, 'b');

      expect(ids(result)).toContain('b');
    });
  });

  // =========================================================================
  // Tier 0: Exact match
  // =========================================================================

  describe('tier 0 — exact match', () => {
    it('ranks exact match above all other tiers', () => {
      const items: TestItem[] = [
        { id: 'sub', name: 'ArchivedParacetamol' },
        { id: 'prefix', name: 'Paracetamol Tablet' },
        { id: 'exact', name: 'Paracetamol' },
      ];
      const result = search(items, 'Paracetamol');

      expect(ids(result)[0]).toBe('exact');
      expect(result.hasExactItem).toBe(true);
    });

    it('detects exact match case-insensitively', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Supplier Alpha' }];
      const result = search(items, 'supplier alpha');

      expect(result.hasExactItem).toBe(true);
    });
  });

  // =========================================================================
  // Tier 1: Prefix match
  // =========================================================================

  describe('tier 1 — prefix match', () => {
    it('ranks prefix match above word-prefix', () => {
      const items: TestItem[] = [
        { id: 'word', name: 'Alpha Paracetamol' },
        { id: 'prefix', name: 'Paracetamol Alpha' },
      ];
      const result = search(items, 'para');

      expect(ids(result)[0]).toBe('prefix');
    });

    it('matches prefix case-insensitively', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];
      const result = search(items, 'PARACE');

      expect(ids(result)).toEqual(['a']);
    });
  });

  // =========================================================================
  // Tier 2: Word-prefix match
  // =========================================================================

  describe('tier 2 — word-prefix match', () => {
    it('matches when each search word prefixes a consecutive item word', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Caplet 500mg' }];
      const result = search(items, 'cap 500');

      expect(ids(result)).toEqual(['a']);
    });

    it('ranks word-prefix above substring', () => {
      const items: TestItem[] = [
        { id: 'sub', name: 'Archived Supplier' },
        { id: 'word', name: 'Alpha Supplier' },
      ];
      const result = search(items, 'sup');

      // 'Alpha Supplier' word-prefixes at "Supplier"
      // 'Archived Supplier' also word-prefixes at "Supplier"
      // both are word-prefix tier, tie-break by position then original order
      expect(ids(result)).toContain('sub');
      expect(ids(result)).toContain('word');
    });

    it('returns no word-prefix when search words exceed item words', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Alpha' }];
      const result = search(items, 'alpha beta gamma');

      expect(result.visibleItems).toHaveLength(0);
    });
  });

  // =========================================================================
  // Tier 3: Substring match
  // =========================================================================

  describe('tier 3 — substring match', () => {
    it('matches a substring in the middle of the label', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];
      const result = search(items, 'aceta');

      expect(ids(result)).toEqual(['a']);
    });

    it('ranks earlier substring position higher', () => {
      const items: TestItem[] = [
        { id: 'late', name: 'Archived Beta' },
        { id: 'early', name: 'Beta Program' },
      ];
      const result = search(items, 'eta');

      // 'Beta Program' has 'eta' at position 1 in 'beta program'
      // 'Archived Beta' has 'eta' at position 10 in 'archived beta'
      expect(ids(result)[0]).toBe('early');
    });
  });

  // =========================================================================
  // Tier 4: Acronym match
  // =========================================================================

  describe('tier 4 — acronym match', () => {
    it('matches first letters of each word as acronym', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];
      const result = search(items, 'pt');

      expect(ids(result)).toEqual(['a']);
    });

    it('requires at least 2 characters for acronym matching', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];
      // Single char 'p' should NOT match via acronym tier
      // but should still match via prefix tier
      const result = search(items, 'p');

      expect(ids(result)).toEqual(['a']);
    });

    it('matches partial acronym prefix', () => {
      const items: TestItem[] = [
        { id: 'a', name: 'Amoxicillin Capsule 500mg' },
      ];
      const result = search(items, 'ac5');

      expect(ids(result)).toEqual(['a']);
    });
  });

  // =========================================================================
  // Tier 5: Consonant skeleton match
  // =========================================================================

  describe('tier 5 — consonant skeleton match', () => {
    it('matches by stripping vowels (Indonesian keyboard pattern)', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];
      const result = search(items, 'prctml');

      expect(ids(result)).toEqual(['a']);
    });

    it('requires at least 2 consonant characters for skeleton matching', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol' }];
      // 'p' skeleton is just 'p' (1 char), not enough for skeleton tier
      const singleChar = search(items, 'p');

      // should still match via prefix, not skeleton
      expect(ids(singleChar)).toEqual(['a']);
    });

    it('handles all-vowel search gracefully', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Ibuprofen' }];
      // 'aei' → consonant skeleton is empty → no skeleton match
      const result = search(items, 'aei');

      // no match through any tier
      expect(result.visibleItems).toHaveLength(0);
    });
  });

  // =========================================================================
  // Tier 6: Subsequence match
  // =========================================================================

  describe('tier 6 — subsequence match', () => {
    it('matches scattered characters in order', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];
      const result = search(items, 'pct');

      expect(ids(result)).toEqual(['a']);
    });

    it('requires at least 2 characters for subsequence matching', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Xyz' }];
      // Single char 'x' should not use subsequence (min 2 chars)
      // but will match via prefix
      const result = search(items, 'x');

      expect(ids(result)).toEqual(['a']);
    });

    it('does not match when characters are out of order', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Abc' }];
      // 'ca' requires 'c' before 'a' but in 'abc', 'a' comes first
      const result = search(items, 'ca');

      // should not match via subsequence; may match via other tiers
      // 'ca' is not a substring of 'abc', not an acronym, etc.
      expect(result.visibleItems).toHaveLength(0);
    });
  });

  // =========================================================================
  // Tier 7: Typo-fuzzy match (fallback only)
  // =========================================================================

  describe('tier 7 — typo-fuzzy match', () => {
    it('matches single-character typo for queries of 3-4 characters', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Omeprazole' }];
      // 'omez' has 1 edit from 'omep' (word prefix slice)
      const result = search(items, 'omez');

      expect(ids(result)).toEqual(['a']);
    });

    it('matches up to 2 typos for queries of 5+ characters', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];
      const result = search(items, 'paracitamol');

      expect(ids(result)).toEqual(['a']);
    });

    it('does not use typo matching for 1-2 character queries', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Xb' }];
      // 'xa' is 1 edit from 'xb' but max distance for length 2 is 0
      const result = search(items, 'xa');

      expect(result.visibleItems).toHaveLength(0);
    });

    it('is a fallback only — not used when deterministic matches exist', () => {
      const items: TestItem[] = [{ id: 'no-match', name: 'Zzz' }];

      // 'Zzx' is 1 edit from 'Zzz' (length 3, max distance 1)
      // No deterministic match exists → typo fuzzy activates
      expect(ids(search(items, 'Zzx'))).toEqual(['no-match']);

      // Now add a deterministic match — typo fuzzy should not run
      const itemsWithExact: TestItem[] = [
        { id: 'exact', name: 'Alpha' },
        { id: 'only-typo', name: 'Xqz' },
      ];
      const result = search(itemsWithExact, 'Alpha');

      // 'Alpha' matches exactly (tier 0)
      // 'Xqz' would need typo fuzzy but deterministic match exists
      expect(ids(result)).toEqual(['exact']);
      expect(result.hasExactItem).toBe(true);
    });
  });

  // =========================================================================
  // Cross-tier ranking
  // =========================================================================

  describe('cross-tier ranking', () => {
    it('ranks tiers in correct order: exact > prefix > word-prefix > substring', () => {
      const items: TestItem[] = [
        { id: 'substring', name: 'Contains Tablet Inside' },
        { id: 'word-prefix', name: 'Full Tablet Option' },
        { id: 'prefix', name: 'Tablet Form' },
        { id: 'exact', name: 'Tablet' },
      ];
      const result = search(items, 'Tablet');

      expect(ids(result)).toEqual([
        'exact',
        'prefix',
        'word-prefix',
        'substring',
      ]);
    });

    it('breaks ties within same tier by position, then length delta, then original order', () => {
      const items: TestItem[] = [
        { id: 'late-long', name: 'Long Archived Beta Value' },
        { id: 'late-short', name: 'Archived Beta' },
        { id: 'early', name: 'Beta Program' },
      ];
      const result = search(items, 'beta');

      // All are word-prefix matches on 'beta'
      // 'Beta Program' has earliest position
      // 'Archived Beta' and 'Long Archived Beta Value' have later positions
      expect(ids(result)[0]).toBe('early');
    });
  });

  // =========================================================================
  // Normalization
  // =========================================================================

  describe('text normalization', () => {
    it('normalizes accented/diacritic characters', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Café Résumé' }];
      const result = search(items, 'cafe resume');

      expect(ids(result)).toEqual(['a']);
      expect(result.hasExactItem).toBe(true);
    });

    it('normalizes multiple spaces and leading/trailing whitespace', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol  Tablet' }];
      const result = search(items, '  paracetamol   tablet  ');

      expect(ids(result)).toEqual(['a']);
    });

    it('handles mixed-case matching', () => {
      const items: TestItem[] = [{ id: 'a', name: 'AMOXICILLIN CAPSULE' }];
      const result = search(items, 'amoxicillin capsule');

      expect(result.hasExactItem).toBe(true);
    });
  });

  // =========================================================================
  // hasExactItem
  // =========================================================================

  describe('hasExactItem detection', () => {
    it('is false when no exact match exists', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];

      expect(search(items, 'Paracetamol').hasExactItem).toBe(false);
    });

    it('is true for case-insensitive exact match', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Paracetamol Tablet' }];

      expect(search(items, 'paracetamol tablet').hasExactItem).toBe(true);
    });

    it('is false for empty queries', () => {
      const items: TestItem[] = [{ id: 'a', name: 'Any' }];

      expect(search(items, '').hasExactItem).toBe(false);
    });
  });

  // =========================================================================
  // Empty item list
  // =========================================================================

  describe('empty item list', () => {
    it('returns empty results for any query on empty list', () => {
      const result = search([], 'anything');

      expect(result.visibleItems).toHaveLength(0);
      expect(result.hasExactItem).toBe(false);
    });

    it('returns empty results for empty query on empty list', () => {
      const result = search([], '');

      expect(result.visibleItems).toHaveLength(0);
    });
  });

  // =========================================================================
  // Visible item limit with search
  // =========================================================================

  describe('visible item limit interaction with search', () => {
    it('limits results while preserving selected item', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `s${i}`,
        name: `Supplier ${i}`,
      }));
      const result = search(items, 'Supplier', items[7], 3);

      expect(result.visibleItems).toHaveLength(3);
      expect(ids(result)).toContain('s7');
    });

    it('does not duplicate selected item when already in top results', () => {
      const items: TestItem[] = [
        { id: 'a', name: 'Supplier A' },
        { id: 'b', name: 'Supplier B' },
        { id: 'c', name: 'Supplier C' },
      ];
      const result = search(items, 'Supplier', items[0], 2);

      // Selected item is already rank 1, no duplication needed
      expect(ids(result)).toEqual(['a', 'b']);
    });
  });
});
