import { describe, expect, it } from 'vitest';
import {
  JOIN_VALUES,
  PATTERN_MARKERS,
  PATTERN_REGEXES,
} from './patternConstants';

describe('patternConstants', () => {
  it('matches complete and partial multi-condition patterns', () => {
    expect(
      PATTERN_REGEXES.MULTI_CONDITION.test(
        '#base_price #greaterThan 50000 #and #lessThan 100000##'
      )
    ).toBe(true);

    expect(
      PATTERN_REGEXES.PARTIAL_JOIN_WITH_HASH.test(
        '#base_price #greaterThan 50000 #and #'
      )
    ).toBe(true);

    expect(
      PATTERN_REGEXES.PARTIAL_JOIN_NO_HASH.test(
        '#base_price #greaterThan 50000 #and'
      )
    ).toBe(true);

    expect(
      PATTERN_REGEXES.INCOMPLETE_MULTI_WITH_VALUE.test(
        '#base_price #greaterThan 50000 #and #lessThan 100000'
      )
    ).toBe(true);

    expect(
      PATTERN_REGEXES.INCOMPLETE_MULTI_CONDITION.test(
        '#base_price #greaterThan 50000 #and #lessThan'
      )
    ).toBe(true);
  });

  it('matches selector and helper patterns', () => {
    expect(
      PATTERN_REGEXES.JOIN_SELECTOR.test('#base_price #greaterThan 50000 #')
    ).toBe(true);
    expect(
      PATTERN_REGEXES.FILTER_PATTERN.test('#base_price #greaterThan 50000')
    ).toBe(true);
    expect(PATTERN_REGEXES.COLON_SYNTAX.test('#name:paracetamol')).toBe(true);

    const secondOperatorSearch = '#base_price #greaterThan 50000 #and #les';
    const firstOperatorSearch = '#base_price #gre';

    expect(
      secondOperatorSearch.match(PATTERN_REGEXES.SECOND_OPERATOR_SEARCH)
    ).toBeTruthy();
    expect(
      firstOperatorSearch.match(PATTERN_REGEXES.FIRST_OPERATOR_SEARCH)
    ).toBeTruthy();

    expect(PATTERN_REGEXES.CONFIRMATION_MARKER.test('#filter##')).toBe(true);
    expect(PATTERN_REGEXES.TRAILING_HASH.test('#filter###')).toBe(true);
    expect(
      PATTERN_REGEXES.JOIN_IN_VALUE.test('50000 #and #lessThan 100000')
    ).toBe(true);
    expect(PATTERN_REGEXES.PARTIAL_JOIN_PATTERN.test(' #and #lessThan')).toBe(
      true
    );
  });

  it('exports marker and join constants', () => {
    expect(PATTERN_MARKERS).toEqual({
      CONFIRMATION: '##',
      HASH: '#',
      SPACE_HASH: ' #',
      SPACE_HASH_SPACE: ' # ',
      COLON: ':',
    });

    expect(JOIN_VALUES).toEqual({
      AND: 'and',
      OR: 'or',
      AND_UPPER: 'AND',
      OR_UPPER: 'OR',
    });
  });
});
