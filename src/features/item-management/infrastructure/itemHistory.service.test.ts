import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: mockRpc,
  },
}));

describe('itemHistoryService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('runs hard rollback through the history rpc and returns deleted count', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { deleted_count: 3 },
      error: null,
    });

    const { itemHistoryService } = await import('./itemHistory.service');

    const result = await itemHistoryService.hardRollbackEntity({
      entityTable: 'items',
      entityId: 'item-1',
      targetVersion: 4,
    });

    expect(mockRpc).toHaveBeenCalledWith('hard_rollback_entity', {
      p_entity_table: 'items',
      p_entity_id: 'item-1',
      p_target_version: 4,
    });
    expect(result).toEqual({
      data: { deleted_count: 3 },
      error: null,
    });
  });

  it('normalizes malformed hard rollback payloads to zero deleted rows', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { deleted_count: '3' },
      error: null,
    });

    const { itemHistoryService } = await import('./itemHistory.service');

    const result = await itemHistoryService.hardRollbackEntity({
      entityTable: 'items',
      entityId: 'item-1',
      targetVersion: 4,
    });

    expect(result).toEqual({
      data: { deleted_count: 0 },
      error: null,
    });
  });
});
