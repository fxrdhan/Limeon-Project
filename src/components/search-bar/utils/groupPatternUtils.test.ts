import { describe, expect, it } from 'vitest';
import {
  countGroupDepth,
  insertGroupCloseToken,
  insertGroupOpenToken,
  normalizeGroupSearchTerm,
  removeGroupTokenAtIndex,
  replaceTrailingHash,
  stripConfirmationMarker,
  tokenizeGroupPattern,
} from './groupPatternUtils';

describe('groupPatternUtils', () => {
  it('counts open-close group depth', () => {
    expect(countGroupDepth('#( #name #contains a #)')).toBe(0);
    expect(countGroupDepth('#( #( #name #contains a')).toBe(2);
    expect(countGroupDepth('#name #contains a')).toBe(0);
  });

  it('strips confirmation marker from tail only', () => {
    expect(stripConfirmationMarker('#name #contains aspirin##')).toBe(
      '#name #contains aspirin'
    );
    expect(stripConfirmationMarker('#name #contains aspirin  ')).toBe(
      '#name #contains aspirin'
    );
  });

  it('replaces trailing hash after removing confirmation marker', () => {
    expect(replaceTrailingHash('#name #contains aspirin #', '#and #')).toBe(
      '#name #contains aspirin #and #'
    );
    expect(replaceTrailingHash('#name #contains aspirin##', '#or #')).toBe(
      '#name #contains aspirin #or #'
    );
    expect(replaceTrailingHash('#', '#(')).toBe('#(');
  });

  it('inserts group open token and trailing space', () => {
    expect(insertGroupOpenToken('#name #contains aspirin #')).toBe(
      '#name #contains aspirin #( '
    );
    expect(insertGroupOpenToken('#name #contains aspirin')).toBe(
      '#name #contains aspirin #( '
    );
  });

  it('inserts group close token when depth allows and preserves confirmation', () => {
    expect(insertGroupCloseToken('#name #contains aspirin')).toBeNull();
    expect(insertGroupCloseToken('#( #name #contains aspirin #')).toBe(
      '#( #name #contains aspirin #)'
    );
    expect(insertGroupCloseToken('#( #name #contains aspirin ##')).toBe(
      '#( #name #contains aspirin #)##'
    );
  });

  it('normalizes literal parenthesis search terms', () => {
    expect(normalizeGroupSearchTerm('(')).toBe('');
    expect(normalizeGroupSearchTerm(')')).toBe('');
    expect(normalizeGroupSearchTerm('name')).toBe('name');
  });

  it('tokenizes grouped pattern syntax', () => {
    const tokens = tokenizeGroupPattern('#( #name #contains aspirin #) ## #');
    expect(tokens.map(token => token.type)).toEqual([
      'groupOpen',
      'other',
      'other',
      'other',
      'groupClose',
      'confirm',
      'marker',
    ]);
  });

  it('tokenizes marker-with-text as other and ignores trailing whitespace', () => {
    const tokens = tokenizeGroupPattern('#( #name #contains aspirin #foo    ');
    expect(tokens.map(token => token.type)).toEqual([
      'groupOpen',
      'other',
      'other',
      'other',
      'other',
    ]);
  });

  it('tokenizes trailing non-token text as other', () => {
    const tokens = tokenizeGroupPattern('#( #name #contains aspirin tail');
    expect(tokens.map(token => token.type)).toEqual([
      'groupOpen',
      'other',
      'other',
      'other',
    ]);
  });

  it('removes group token by occurrence index', () => {
    expect(
      removeGroupTokenAtIndex(
        '#( #name #contains a #) #( #stock #equals 1',
        'groupOpen',
        1
      )
    ).toBe('#( #name #contains a #) #stock #equals 1');
    expect(
      removeGroupTokenAtIndex('#( #name #contains a #) #)', 'groupClose', 0)
    ).toBe('#( #name #contains a #)');
    expect(removeGroupTokenAtIndex('#name #contains a', 'groupClose', 0)).toBe(
      '#name #contains a'
    );
  });
});
