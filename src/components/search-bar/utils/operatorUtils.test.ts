import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
} from '../operators';
import type { SearchColumn } from '../types';
import {
  findOperator,
  findOperatorForColumn,
  getAvailableOperators,
  getOperatorLabel,
  getOperatorLabelForColumn,
  getOperatorsForColumn,
  isOperatorCompatible,
  isOperatorCompatibleWithColumn,
} from './operatorUtils';

const textColumn: SearchColumn = {
  field: 'name',
  headerName: 'Name',
  searchable: true,
  type: 'text',
};

const numberColumn: SearchColumn = {
  field: 'stock',
  headerName: 'Stock',
  searchable: true,
  type: 'number',
};

describe('operatorUtils', () => {
  it('returns operator list based on column type', () => {
    expect(getAvailableOperators('number')).toBe(NUMBER_FILTER_OPERATORS);
    expect(getAvailableOperators('currency')).toBe(NUMBER_FILTER_OPERATORS);
    expect(getAvailableOperators('text')).toBe(DEFAULT_FILTER_OPERATORS);
  });

  it('returns operators for specific column', () => {
    expect(getOperatorsForColumn(numberColumn)).toBe(NUMBER_FILTER_OPERATORS);
    expect(getOperatorsForColumn(textColumn)).toBe(DEFAULT_FILTER_OPERATORS);
  });

  it('finds operators by value and label format', () => {
    expect(findOperator('text', 'contains')?.value).toBe('contains');
    expect(findOperator('number', 'greaterThan')?.value).toBe('greaterThan');
    expect(findOperator('number', 'greater than')?.value).toBe('greaterThan');
    expect(findOperator('number', 'GreaterThan')?.value).toBe('greaterThan');
  });

  it('finds operators for a specific column', () => {
    expect(findOperatorForColumn(numberColumn, 'inRange')?.value).toBe(
      'inRange'
    );
    expect(findOperatorForColumn(textColumn, 'inRange')).toBeUndefined();
  });

  it('checks compatibility helpers', () => {
    expect(isOperatorCompatible('number', 'inRange')).toBe(true);
    expect(isOperatorCompatible('text', 'inRange')).toBe(false);

    expect(isOperatorCompatibleWithColumn(numberColumn, 'inRange')).toBe(true);
    expect(isOperatorCompatibleWithColumn(textColumn, 'inRange')).toBe(false);
  });

  it('returns operator labels with fallback across operator groups', () => {
    expect(getOperatorLabel('number', 'greaterThan')).toBe('Greater than');
    expect(getOperatorLabel('text', 'inRange')).toBe('Between');
    expect(getOperatorLabel('text', 'unknownOperator')).toBe('unknownOperator');
    expect(getOperatorLabelForColumn(numberColumn, 'inRange')).toBe('Between');
  });
});
