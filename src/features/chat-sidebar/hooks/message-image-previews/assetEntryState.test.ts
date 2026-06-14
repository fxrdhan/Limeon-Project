import { describe, expect, it } from 'vite-plus/test';
import type { ResolvedChatAssetUrlEntry } from '../../utils/message-file';
import {
  getNextPreviewAssetExpiryAt,
  pruneExpiredPreviewAssetEntries,
  pruneRecordByActiveIds,
} from './assetEntryState';

const entry = (
  url: string,
  expiresAt: number | null
): ResolvedChatAssetUrlEntry => ({
  url,
  expiresAt,
});

describe('message image preview asset entry state helpers', () => {
  it('preserves record identity when active ids keep every entry', () => {
    const previousRecord = {
      first: 'blob:first',
      second: 'blob:second',
    };

    expect(
      pruneRecordByActiveIds(previousRecord, new Set(['first', 'second']))
    ).toBe(previousRecord);
  });

  it('prunes records outside the active message id set', () => {
    expect(
      pruneRecordByActiveIds(
        {
          first: 'blob:first',
          stale: 'blob:stale',
        },
        new Set(['first'])
      )
    ).toEqual({
      first: 'blob:first',
    });
  });

  it('finds the closest non-null preview asset expiry', () => {
    expect(
      getNextPreviewAssetExpiryAt({
        never: entry('blob:never', null),
        later: entry('blob:later', 3000),
        earlier: entry('blob:earlier', 1000),
      })
    ).toBe(1000);

    expect(
      getNextPreviewAssetExpiryAt({
        never: entry('blob:never', null),
      })
    ).toBeNull();
  });

  it('prunes expired preview entries while keeping fresh entries', () => {
    const freshEntry = entry('blob:fresh', 5000);
    const previousEntries = {
      stale: entry('blob:stale', 1000),
      fresh: freshEntry,
      persistent: entry('blob:persistent', null),
    };

    expect(pruneExpiredPreviewAssetEntries(previousEntries, 2000)).toEqual({
      fresh: freshEntry,
      persistent: previousEntries.persistent,
    });
  });

  it('preserves preview entry record identity when no entries expire', () => {
    const previousEntries = {
      fresh: entry('blob:fresh', 5000),
      persistent: entry('blob:persistent', null),
    };

    expect(pruneExpiredPreviewAssetEntries(previousEntries, 2000)).toBe(
      previousEntries
    );
  });
});
