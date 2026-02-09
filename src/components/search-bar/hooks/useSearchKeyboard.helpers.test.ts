import { afterEach, describe, expect, it, vi } from 'vitest';

const removeGroupTokenAtIndexMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/groupPatternUtils', () => ({
  insertGroupOpenToken: vi.fn(),
  insertGroupCloseToken: vi.fn(),
  removeGroupTokenAtIndex: removeGroupTokenAtIndexMock,
}));

import {
  collapsePatternWhitespace,
  deleteGroupedPartialTail,
  deleteLastBadgeUnit,
  ensureTrailingHash,
  stripTrailingConfirmation,
} from './useSearchKeyboard';

describe('useSearchKeyboard helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    removeGroupTokenAtIndexMock.mockReset();
  });

  it('normalizes confirmation marker and trailing hash formatting', () => {
    expect(stripTrailingConfirmation('#name #contains aspirin##   ')).toBe(
      '#name #contains aspirin'
    );
    expect(stripTrailingConfirmation('#name #contains')).toBe(
      '#name #contains'
    );

    expect(ensureTrailingHash('')).toBe('#');
    expect(ensureTrailingHash('#name #contains aspirin')).toBe(
      '#name #contains aspirin #'
    );
    expect(ensureTrailingHash('#name #contains aspirin #')).toBe(
      '#name #contains aspirin #'
    );
  });

  it('collapses internal spaces while preserving trailing space', () => {
    expect(collapsePatternWhitespace('   #name    #contains   aspirin  ')).toBe(
      '#name #contains aspirin '
    );
  });

  it('deletes the last badge unit across token/value variants', () => {
    expect(deleteLastBadgeUnit('')).toBe('');
    expect(deleteLastBadgeUnit('plain text')).toBe('');
    expect(deleteLastBadgeUnit('#name')).toBe('');
    expect(deleteLastBadgeUnit('#')).toBe('');
    expect(deleteLastBadgeUnit('#name #')).toBe('');
    expect(deleteLastBadgeUnit('#)')).toBe('');
    expect(deleteLastBadgeUnit('#(')).toBe('');

    expect(deleteLastBadgeUnit('#name #contains aspirin')).toBe(
      '#name #contains'
    );
    expect(deleteLastBadgeUnit('#name #contains')).toBe('#name');

    expect(deleteLastBadgeUnit('#name #contains aspirin #and value')).toBe(
      '#name #contains aspirin #and '
    );

    expect(deleteLastBadgeUnit('#name #contains aspirin##')).toBe(
      '#name #contains'
    );

    expect(deleteLastBadgeUnit('abc #foo##')).toBe('abc##');
    expect(deleteLastBadgeUnit('#) #foo##')).toBe('#)##');
  });

  it('handles grouped-tail deletion branches and selector fallback', () => {
    expect(deleteGroupedPartialTail('#name #contains aspirin')).toBeNull();
    expect(deleteGroupedPartialTail('#(     ')).toBeUndefined();

    removeGroupTokenAtIndexMock.mockReturnValueOnce('#name #');
    expect(deleteGroupedPartialTail('#( #')).toBe('#name #');

    removeGroupTokenAtIndexMock.mockReturnValueOnce('#( #name #contains x');
    expect(deleteGroupedPartialTail('#( #name #contains x #)')).toBe(
      '#( #name #contains x'
    );
    expect(removeGroupTokenAtIndexMock).toHaveBeenCalledWith(
      '#( #name #contains x #)',
      'groupClose',
      0
    );

    expect(deleteGroupedPartialTail('#( #name #contains x #and #')).toBe(
      '#( #name #contains x'
    );

    expect(deleteGroupedPartialTail('#( #name aspirin')).toBe('#( #name ');
    expect(deleteGroupedPartialTail('#( #name #contains')).toBe('#( #name #');
    expect(deleteGroupedPartialTail('#( plain')).toBeNull();
  });
});
