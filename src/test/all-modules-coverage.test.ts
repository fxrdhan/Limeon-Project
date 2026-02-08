import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

type RealtimeChannelMock = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const createRealtimeChannelMock = (): RealtimeChannelMock => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
});

const createSupabaseMock = () => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi
      .fn()
      .mockImplementation((resolve: (value: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve)
      ),
  })),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  channel: vi.fn(() => createRealtimeChannelMock()),
  removeChannel: vi.fn(),
  removeAllChannels: vi.fn(),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/mock.jpg' },
      }),
    }),
  },
});

const supabaseMock = createSupabaseMock();

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createSupabaseMock()),
}));

vi.mock('ag-grid-enterprise', () => ({
  AdvancedFilterModule: {},
  CellSelectionModule: {},
  ClipboardModule: {},
  ColumnsToolPanelModule: {},
  ExcelExportModule: {},
  FiltersToolPanelModule: {},
  MenuModule: {},
  MultiFilterModule: {},
  NewFiltersToolPanelModule: {},
  RowGroupingModule: {},
  RowGroupingPanelModule: {},
  RowNumbersModule: {},
  RowSelectionModule: {},
  SetFilterModule: {},
  LicenseManager: {
    setLicenseKey: vi.fn(),
  },
}));

const modules = import.meta.glob('/src/**/*.{ts,tsx}');

const isProductionModule = (modulePath: string) => {
  if (!modulePath.startsWith('/src/')) return false;
  if (modulePath.startsWith('/src/test/')) return false;
  if (modulePath.includes('/__tests__/')) return false;
  if (modulePath.includes('/schemas/generated/')) return false;
  if (modulePath.endsWith('.d.ts')) return false;
  if (modulePath.endsWith('.test.ts')) return false;
  if (modulePath.endsWith('.test.tsx')) return false;
  if (modulePath.endsWith('.spec.ts')) return false;
  if (modulePath.endsWith('.spec.tsx')) return false;
  return true;
};

const productionModuleEntries = Object.entries(modules)
  .filter(([modulePath]) => isProductionModule(modulePath))
  .sort(([a], [b]) => a.localeCompare(b));

describe('all production modules are loadable', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('VITE_SUPABASE_FUNCTIONS_URL', 'https://example.functions.co');

    if (!document.getElementById('root')) {
      const root = document.createElement('div');
      root.id = 'root';
      document.body.appendChild(root);
    }
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('imports each production source file', async () => {
    const failedImports: Array<{ modulePath: string; message: string }> = [];

    for (const [modulePath, loader] of productionModuleEntries) {
      try {
        await loader();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failedImports.push({ modulePath, message });
      }
    }

    if (failedImports.length > 0) {
      const debugOutput = failedImports
        .map(
          ({ modulePath, message }) =>
            `${modulePath} -> ${message.split('\n')[0]}`
        )
        .join('\n');

      throw new Error(`Failed module imports:\n${debugOutput}`);
    }

    expect(failedImports).toHaveLength(0);
  }, 120_000);
});
