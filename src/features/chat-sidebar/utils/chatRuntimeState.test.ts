import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { CHAT_RUNTIME_LOCAL_STORAGE_KEYS } from '../../../lib/chatRuntimePersistence';

const importRuntimeState = async () => {
  vi.resetModules();
  return import('./chatRuntimeState');
};

describe('chat runtime state storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
  });

  it('removes malformed storage payloads after a failed read', async () => {
    const { readRuntimeStorage } = await importRuntimeState();
    window.localStorage.setItem('chat-runtime-corrupt', 'not-json');

    expect(readRuntimeStorage('chat-runtime-corrupt', 'local')).toBeNull();
    expect(window.localStorage.getItem('chat-runtime-corrupt')).toBeNull();
  });

  it('does not persist payloads that cannot be serialized into JSON text', async () => {
    const { writeRuntimeStorage } = await importRuntimeState();

    expect(
      writeRuntimeStorage('chat-runtime-invalid', undefined, 'local')
    ).toBe(false);
    expect(window.localStorage.getItem('chat-runtime-invalid')).toBeNull();
  });

  it('hydrates pending read receipts with normalized user and message ids', async () => {
    window.localStorage.setItem(
      CHAT_RUNTIME_LOCAL_STORAGE_KEYS.pendingReadReceipts,
      JSON.stringify({
        ' user-a ': [' message-1 ', 'message-1', '', null],
        '': ['message-hidden'],
        'user-b': 'not-a-list',
        'user-c': [null, ' message-2 '],
      })
    );

    const { pendingReadReceiptsStore } = await importRuntimeState();

    pendingReadReceiptsStore.hydrate();

    expect(
      [...pendingReadReceiptsStore.value.entries()].map(
        ([userId, messageIds]) => [userId, [...messageIds]]
      )
    ).toEqual([
      ['user-a', ['message-1']],
      ['user-c', ['message-2']],
    ]);
  });
});
