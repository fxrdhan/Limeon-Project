export const QueryKeys = {
  // Items
  items: {
    all: ['items'] as const,
    lists: () => [...QueryKeys.items.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QueryKeys.items.lists(), { filters }] as const,
    details: () => [...QueryKeys.items.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.items.details(), id] as const,
    search: (query: string, filters?: Record<string, unknown>) => [...QueryKeys.items.all, 'search', query, { filters }] as const,
    unitConversions: (itemId: string) => [...QueryKeys.items.detail(itemId), 'unitConversions'] as const,
  },

  // Purchases
  purchases: {
    all: ['purchases'] as const,
    lists: () => [...QueryKeys.purchases.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QueryKeys.purchases.lists(), { filters }] as const,
    details: () => [...QueryKeys.purchases.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.purchases.details(), id] as const,
    items: (purchaseId: string) => [...QueryKeys.purchases.detail(purchaseId), 'items'] as const,
  },

  // Sales
  sales: {
    all: ['sales'] as const,
    lists: () => [...QueryKeys.sales.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QueryKeys.sales.lists(), { filters }] as const,
    details: () => [...QueryKeys.sales.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.sales.details(), id] as const,
    items: (saleId: string) => [...QueryKeys.sales.detail(saleId), 'items'] as const,
  },

  // Master Data
  masterData: {
    // Categories
    categories: {
      all: ['masterData', 'categories'] as const,
      lists: () => [...QueryKeys.masterData.categories.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) => [...QueryKeys.masterData.categories.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.categories.all, 'detail'] as const,
      detail: (id: string) => [...QueryKeys.masterData.categories.details(), id] as const,
    },

    // Types
    types: {
      all: ['masterData', 'types'] as const,
      lists: () => [...QueryKeys.masterData.types.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) => [...QueryKeys.masterData.types.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.types.all, 'detail'] as const,
      detail: (id: string) => [...QueryKeys.masterData.types.details(), id] as const,
    },

    // Units
    units: {
      all: ['masterData', 'units'] as const,
      lists: () => [...QueryKeys.masterData.units.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) => [...QueryKeys.masterData.units.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.units.all, 'detail'] as const,
      detail: (id: string) => [...QueryKeys.masterData.units.details(), id] as const,
    },

    // Suppliers
    suppliers: {
      all: ['masterData', 'suppliers'] as const,
      lists: () => [...QueryKeys.masterData.suppliers.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) => [...QueryKeys.masterData.suppliers.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.suppliers.all, 'detail'] as const,
      detail: (id: string) => [...QueryKeys.masterData.suppliers.details(), id] as const,
    },
  },

  // Patients
  patients: {
    all: ['patients'] as const,
    lists: () => [...QueryKeys.patients.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QueryKeys.patients.lists(), { filters }] as const,
    details: () => [...QueryKeys.patients.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.patients.details(), id] as const,
    search: (query: string) => [...QueryKeys.patients.all, 'search', query] as const,
  },

  // Doctors
  doctors: {
    all: ['doctors'] as const,
    lists: () => [...QueryKeys.doctors.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QueryKeys.doctors.lists(), { filters }] as const,
    details: () => [...QueryKeys.doctors.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.doctors.details(), id] as const,
    search: (query: string) => [...QueryKeys.doctors.all, 'search', query] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...QueryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QueryKeys.users.lists(), { filters }] as const,
    details: () => [...QueryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.users.details(), id] as const,
    profile: ['users', 'profile'] as const,
  },

  // Company Profile
  companyProfile: {
    all: ['companyProfile'] as const,
    detail: ['companyProfile', 'detail'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: ['dashboard', 'stats'] as const,
    topSellingMedicines: ['dashboard', 'topSellingMedicines'] as const,
    salesAnalytics: (period?: string) => ['dashboard', 'salesAnalytics', period] as const,
    stockAlerts: ['dashboard', 'stockAlerts'] as const,
  },

  // API Metrics
  apiMetrics: {
    all: ['apiMetrics'] as const,
    lists: () => [...QueryKeys.apiMetrics.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QueryKeys.apiMetrics.lists(), { filters }] as const,
  },
} as const;

// Helper function to invalidate related queries
export const getInvalidationKeys = {
  items: {
    all: () => [QueryKeys.items.all],
    related: () => [QueryKeys.items.all, QueryKeys.dashboard.all],
  },
  purchases: {
    all: () => [QueryKeys.purchases.all],
    related: () => [QueryKeys.purchases.all, QueryKeys.items.all, QueryKeys.dashboard.all],
  },
  sales: {
    all: () => [QueryKeys.sales.all],
    related: () => [QueryKeys.sales.all, QueryKeys.items.all, QueryKeys.dashboard.all],
  },
  masterData: {
    categories: () => [QueryKeys.masterData.categories.all, QueryKeys.items.all],
    types: () => [QueryKeys.masterData.types.all, QueryKeys.items.all],
    units: () => [QueryKeys.masterData.units.all, QueryKeys.items.all],
    suppliers: () => [QueryKeys.masterData.suppliers.all, QueryKeys.purchases.all],
  },
  patients: {
    all: () => [QueryKeys.patients.all],
    related: () => [QueryKeys.patients.all, QueryKeys.sales.all],
  },
  doctors: {
    all: () => [QueryKeys.doctors.all],
    related: () => [QueryKeys.doctors.all, QueryKeys.sales.all],
  },
} as const;