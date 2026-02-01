import { describe, it, expect } from 'vitest';
import { analyzeGridFilter, parseBadgePattern } from './gridFilterSync';

describe('gridFilterSync', () => {
  it('handles empty filters', () => {
    expect(analyzeGridFilter(null)).toEqual({ isSimple: true });
  });

  it('converts simple text filters to badge patterns', () => {
    const model = {
      name: {
        filterType: 'text',
        type: 'contains',
        filter: 'alpha',
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(true);
    expect(result.badgePattern).toBe('#name #contains alpha');
  });

  it('converts combined conditions to badge patterns', () => {
    const model = {
      name: {
        filterType: 'text',
        operator: 'AND',
        conditions: [
          { filterType: 'text', type: 'contains', filter: 'alpha' },
          { filterType: 'text', type: 'equals', filter: 'beta' },
        ],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(true);
    expect(result.badgePattern).toBe('#name #contains alpha #and #equals beta');
  });

  it('treats non-text filters as complex', () => {
    const model = {
      qty: { filterType: 'number', type: 'greaterThan', filter: 5 },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(false);
  });

  it('handles combined filters with insufficient conditions', () => {
    const model = {
      name: {
        filterType: 'text',
        operator: 'AND',
        conditions: [{ filterType: 'text', type: 'contains', filter: 'alpha' }],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(false);
  });

  it('treats non-text combined filters as complex', () => {
    const model = {
      qty: {
        filterType: 'number',
        operator: 'AND',
        conditions: [
          { filterType: 'number', type: 'greaterThan', filter: 5 },
          { filterType: 'number', type: 'lessThan', filter: 10 },
        ],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(false);
  });

  it('treats combined filters with non-string values as complex', () => {
    const model = {
      name: {
        filterType: 'text',
        operator: 'AND',
        conditions: [
          { filterType: 'text', type: 'contains', filter: 123 },
          { filterType: 'text', type: 'equals', filter: 456 },
        ],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(false);
  });

  it('handles multi-filter models', () => {
    const model = {
      name: {
        filterType: 'multi',
        filterModels: [
          { filterType: 'text', type: 'contains', filter: 'alpha' },
        ],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(true);
    expect(result.badgePattern).toBe('#name #contains alpha');
  });

  it('handles multi-filter combined models', () => {
    const model = {
      name: {
        filterType: 'multi',
        filterModels: [
          {
            filterType: 'text',
            operator: 'OR',
            conditions: [
              { filterType: 'text', type: 'contains', filter: 'alpha' },
              { filterType: 'text', type: 'equals', filter: 'beta' },
            ],
          },
        ],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(true);
    expect(result.badgePattern).toBe('#name #contains alpha #or #equals beta');
  });

  it('treats multi-filter simple models with non-text values as complex', () => {
    const model = {
      name: {
        filterType: 'multi',
        filterModels: [
          { filterType: 'number', type: 'greaterThan', filter: 5 },
        ],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(false);
  });

  it('treats multi-filter combined models with non-string values as complex', () => {
    const model = {
      name: {
        filterType: 'multi',
        filterModels: [
          {
            filterType: 'text',
            operator: 'AND',
            conditions: [
              { filterType: 'text', type: 'contains', filter: 123 },
              { filterType: 'text', type: 'equals', filter: 456 },
            ],
          },
        ],
      },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(false);
  });

  it('treats multi-column filters as complex', () => {
    const model = {
      name: { filterType: 'text', type: 'contains', filter: 'alpha' },
      code: { filterType: 'text', type: 'contains', filter: 'beta' },
    };

    const result = analyzeGridFilter(model);
    expect(result.isSimple).toBe(false);
    expect(result.complexInfo).toContain('2');
  });

  it('parses badge patterns', () => {
    expect(parseBadgePattern('#name #contains alpha')).toEqual({
      field: 'name',
      operator: 'contains',
      value: 'alpha',
    });
    expect(parseBadgePattern('invalid')).toBeNull();
  });
});
