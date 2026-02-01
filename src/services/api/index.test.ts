import { describe, it, expect, vi } from 'vitest';

const fromMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());
const storageFromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn(),
      refreshSession: vi.fn(),
    },
    storage: {
      from: storageFromMock,
    },
  },
}));

import * as api from './index';

describe('api index exports', () => {
  it('exposes service classes and instances', () => {
    expect(api.BaseService).toBeTypeOf('function');
    expect(api.ItemsService).toBeTypeOf('function');
    expect(api.itemsService).toBeDefined();
    expect(api.dashboardService).toBeDefined();
    expect(api.DashboardService).toBeTypeOf('function');
    expect(api.StorageService).toBeDefined();
  });
});
