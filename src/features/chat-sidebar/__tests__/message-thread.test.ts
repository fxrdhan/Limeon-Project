import { describe, expect, it } from 'vitest';
import {
  getPersistedDeletedThreadMessageIds,
  resolveDeletedThreadMessageIds,
} from '../utils/message-thread';

describe('message-thread utils', () => {
  it('falls back to provided ids when the delete rpc returns no ids', () => {
    expect(
      resolveDeletedThreadMessageIds(null, ['message-1', 'message-1'])
    ).toEqual(['message-1']);
  });

  it('filters temp ids from persisted delete broadcasts', () => {
    expect(
      getPersistedDeletedThreadMessageIds(
        ['temp_1', 'message-1'],
        ['message-2']
      )
    ).toEqual(['message-1']);
  });
});
