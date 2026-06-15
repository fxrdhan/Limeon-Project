import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import { pendingReadReceiptsStore } from '../utils/chatRuntimeState';

const resetReadReceiptCache = () => {
  window.localStorage.clear();
  pendingReadReceiptsStore.value.clear();
};

describe('read receipt runtime cache', () => {
  beforeEach(resetReadReceiptCache);
  afterEach(resetReadReceiptCache);

  it('normalizes user and message ids when queueing read receipts', () => {
    expect(
      chatRuntimeCache.readReceipts.queueMessageIds(' user-a ', [
        ' message-1 ',
        'message-1',
        '',
      ])
    ).toBe(true);

    expect(chatRuntimeCache.readReceipts.peekMessageIds('user-a')).toEqual([
      'message-1',
    ]);
    expect(pendingReadReceiptsStore.value.has(' user-a ')).toBe(false);
    expect(pendingReadReceiptsStore.value.has('user-a')).toBe(true);
  });

  it('does not create empty user entries while reading missing receipts', () => {
    expect(
      chatRuntimeCache.readReceipts.peekMessageIds('missing-user')
    ).toEqual([]);
    expect(
      chatRuntimeCache.readReceipts.hasPendingMessageIds('missing-user')
    ).toBe(false);
    expect(
      chatRuntimeCache.readReceipts.ackMessageIds('missing-user', ['message-1'])
    ).toBe(false);

    expect(pendingReadReceiptsStore.value.has('missing-user')).toBe(false);
  });

  it('prunes empty user entries after acknowledging queued receipts', () => {
    chatRuntimeCache.readReceipts.queueMessageIds('user-a', [
      'message-1',
      'message-2',
    ]);

    expect(
      chatRuntimeCache.readReceipts.ackMessageIds('user-a', [
        'message-1',
        'message-2',
      ])
    ).toBe(true);

    expect(chatRuntimeCache.readReceipts.hasPendingMessageIds('user-a')).toBe(
      false
    );
    expect(pendingReadReceiptsStore.value.has('user-a')).toBe(false);
  });

  it('normalizes user ids when resetting one user queue', () => {
    chatRuntimeCache.readReceipts.queueMessageIds('user-a', ['message-1']);
    chatRuntimeCache.readReceipts.queueMessageIds('user-b', ['message-2']);

    chatRuntimeCache.readReceipts.reset(' user-a ');

    expect(chatRuntimeCache.readReceipts.hasPendingMessageIds('user-a')).toBe(
      false
    );
    expect(chatRuntimeCache.readReceipts.hasPendingMessageIds('user-b')).toBe(
      true
    );
  });
});
