import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe('chatForwardService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('forwards chat messages through the edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        forwardedRecipientIds: ['user-b', 'user-c'],
        failedRecipientIds: [],
      },
      error: null,
    });

    const { chatForwardService } = await import('./forward.service');

    const result = await chatForwardService.forwardMessage({
      messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
      recipientIds: ['user-b', 'user-c'],
    });

    expect(mockInvoke).toHaveBeenCalledWith('chat-forward-message', {
      body: {
        messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
        recipientIds: ['user-b', 'user-c'],
      },
    });
    expect(result).toEqual({
      data: {
        forwardedRecipientIds: ['user-b', 'user-c'],
        failedRecipientIds: [],
      },
      error: null,
    });
  });

  it('normalizes duplicate and empty recipient ids from the edge response', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        forwardedRecipientIds: ['user-b', 'user-b', '', 'user-c'],
        failedRecipientIds: ['user-d', 'user-d', ''],
      },
      error: null,
    });

    const { chatForwardService } = await import('./forward.service');

    const result = await chatForwardService.forwardMessage({
      messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
      recipientIds: ['user-b'],
    });

    expect(result).toEqual({
      data: {
        forwardedRecipientIds: ['user-b', 'user-c'],
        failedRecipientIds: ['user-d'],
      },
      error: null,
    });
  });

  it('surfaces malformed recipient lists from the edge response', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        forwardedRecipientIds: ['user-b', 7],
        failedRecipientIds: [],
      },
      error: null,
    });

    const { chatForwardService } = await import('./forward.service');

    const result = await chatForwardService.forwardMessage({
      messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
      recipientIds: ['user-b'],
    });

    expect(result.data).toBeNull();
    expect(result.error).toEqual(
      expect.objectContaining({
        code: 'CHAT_CONTRACT_INVALID',
        message:
          'Chat contract violation: forward.forwardedRecipientIds[1] must be a string.',
      })
    );
  });
});
