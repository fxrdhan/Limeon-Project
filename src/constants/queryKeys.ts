export const QueryKeys = {
  // Items
  items: {
    all: ['items'] as const,
    lists: () => [...QueryKeys.items.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.items.lists(), { filters }] as const,
    details: () => [...QueryKeys.items.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.items.details(), id] as const,
    search: (query: string, filters?: Record<string, unknown>) =>
      [...QueryKeys.items.all, 'search', query, { filters }] as const,
    byCategory: (categoryId: string) =>
      [...QueryKeys.items.all, 'byCategory', categoryId] as const,
    byType: (typeId: string) =>
      [...QueryKeys.items.all, 'byType', typeId] as const,
    lowStock: (threshold: number) =>
      [...QueryKeys.items.all, 'lowStock', threshold] as const,
    checkCode: (code: string, excludeId?: string) =>
      [...QueryKeys.items.all, 'checkCode', code, excludeId] as const,
    checkBarcode: (barcode: string, excludeId?: string) =>
      [...QueryKeys.items.all, 'checkBarcode', barcode, excludeId] as const,
    packageConversions: (itemId: string) =>
      [...QueryKeys.items.detail(itemId), 'packageConversions'] as const,
  },

  // Purchases
  purchases: {
    all: ['purchases'] as const,
    lists: () => [...QueryKeys.purchases.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.purchases.lists(), { filters }] as const,
    paginated: (page: number, searchTerm: string, limit: number) =>
      [...QueryKeys.purchases.all, page, searchTerm, limit] as const,
    details: () => [...QueryKeys.purchases.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.purchases.details(), id] as const,
    items: (purchaseId: string) =>
      [...QueryKeys.purchases.detail(purchaseId), 'items'] as const,
    bySupplier: (supplierId: string) =>
      [...QueryKeys.purchases.all, 'bySupplier', supplierId] as const,
    byPaymentStatus: (status: string) =>
      [...QueryKeys.purchases.all, 'byPaymentStatus', status] as const,
    byDateRange: (startDate: string, endDate: string) =>
      [...QueryKeys.purchases.all, 'byDateRange', startDate, endDate] as const,
    checkInvoice: (invoiceNumber: string, excludeId?: string) =>
      [
        ...QueryKeys.purchases.all,
        'checkInvoice',
        invoiceNumber,
        excludeId,
      ] as const,
  },

  // Sales
  sales: {
    all: ['sales'] as const,
    lists: () => [...QueryKeys.sales.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.sales.lists(), { filters }] as const,
    details: () => [...QueryKeys.sales.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.sales.details(), id] as const,
    items: (saleId: string) =>
      [...QueryKeys.sales.detail(saleId), 'items'] as const,
  },

  // Master Data
  masterData: {
    all: ['masterData', 'all'] as const,
    // Categories
    categories: {
      all: ['masterData', 'categories'] as const,
      lists: () => [...QueryKeys.masterData.categories.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...QueryKeys.masterData.categories.lists(), { filters }] as const,
      details: () =>
        [...QueryKeys.masterData.categories.all, 'detail'] as const,
      detail: (id: string) =>
        [...QueryKeys.masterData.categories.details(), id] as const,
    },

    // Types
    types: {
      all: ['masterData', 'types'] as const,
      lists: () => [...QueryKeys.masterData.types.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...QueryKeys.masterData.types.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.types.all, 'detail'] as const,
      detail: (id: string) =>
        [...QueryKeys.masterData.types.details(), id] as const,
    },

    // Packages
    packages: {
      all: ['masterData', 'packages'] as const,
      lists: () => [...QueryKeys.masterData.packages.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...QueryKeys.masterData.packages.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.packages.all, 'detail'] as const,
      detail: (id: string) =>
        [...QueryKeys.masterData.packages.details(), id] as const,
    },

    // Suppliers
    suppliers: {
      all: ['masterData', 'suppliers'] as const,
      lists: () => [...QueryKeys.masterData.suppliers.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...QueryKeys.masterData.suppliers.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.suppliers.all, 'detail'] as const,
      detail: (id: string) =>
        [...QueryKeys.masterData.suppliers.details(), id] as const,
      search: (query: string) => ['suppliers', 'search', query] as const,
    },

    // Dosages
    dosages: {
      all: ['masterData', 'dosages'] as const,
      lists: () => [...QueryKeys.masterData.dosages.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...QueryKeys.masterData.dosages.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.dosages.all, 'detail'] as const,
      detail: (id: string) =>
        [...QueryKeys.masterData.dosages.details(), id] as const,
    },

    // Manufacturers
    manufacturers: {
      all: ['masterData', 'manufacturers'] as const,
      lists: () => [...QueryKeys.masterData.manufacturers.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...QueryKeys.masterData.manufacturers.lists(), { filters }] as const,
      details: () =>
        [...QueryKeys.masterData.manufacturers.all, 'detail'] as const,
      detail: (id: string) =>
        [...QueryKeys.masterData.manufacturers.details(), id] as const,
    },

    // Item Units (distinct from units which refers to packages)
    itemUnits: {
      all: ['item_units'] as const,
      lists: () => [...QueryKeys.masterData.itemUnits.all, 'list'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...QueryKeys.masterData.itemUnits.lists(), { filters }] as const,
      details: () => [...QueryKeys.masterData.itemUnits.all, 'detail'] as const,
      detail: (id: string) =>
        [...QueryKeys.masterData.itemUnits.details(), id] as const,
    },
  },

  // Patients
  patients: {
    all: ['patients'] as const,
    lists: () => [...QueryKeys.patients.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.patients.lists(), { filters }] as const,
    details: () => [...QueryKeys.patients.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.patients.details(), id] as const,
    search: (query: string) =>
      [...QueryKeys.patients.list(), 'search', query] as const,
    byGender: (gender: string) =>
      [...QueryKeys.patients.list(), 'gender', gender] as const,
    recent: (limit: number) =>
      [...QueryKeys.patients.list(), 'recent', limit] as const,
  },

  // Doctors
  doctors: {
    all: ['doctors'] as const,
    lists: () => [...QueryKeys.doctors.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.doctors.lists(), { filters }] as const,
    details: () => [...QueryKeys.doctors.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.doctors.details(), id] as const,
    search: (query: string) =>
      [...QueryKeys.doctors.list(), 'search', query] as const,
    bySpecialization: (specialization: string) =>
      [...QueryKeys.doctors.list(), 'specialization', specialization] as const,
    byExperience: (minYears: number) =>
      [...QueryKeys.doctors.list(), 'experience', minYears] as const,
    recent: (limit: number) =>
      [...QueryKeys.doctors.list(), 'recent', limit] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...QueryKeys.customers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.customers.lists(), { filters }] as const,
    details: () => [...QueryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.customers.details(), id] as const,
    search: (query: string) =>
      [...QueryKeys.customers.all, 'search', query] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...QueryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.users.lists(), { filters }] as const,
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
    salesAnalytics: (period?: string) =>
      ['dashboard', 'salesAnalytics', period] as const,
    stockAlerts: ['dashboard', 'stockAlerts'] as const,
    recentTransactions: (limit: number) =>
      ['dashboard', 'recentTransactions', limit] as const,
    monthlyRevenue: ['dashboard', 'monthlyRevenue'] as const,
  },

  // API Metrics
  apiMetrics: {
    all: ['apiMetrics'] as const,
    lists: () => [...QueryKeys.apiMetrics.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...QueryKeys.apiMetrics.lists(), { filters }] as const,
  },

  // Generic table queries (fallback for dynamic tables)
  tables: {
    byName: (table: string) => [table] as const,
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
    related: () => [
      QueryKeys.purchases.all,
      QueryKeys.items.all,
      QueryKeys.dashboard.all,
    ],
  },
  sales: {
    all: () => [QueryKeys.sales.all],
    related: () => [
      QueryKeys.sales.all,
      QueryKeys.items.all,
      QueryKeys.dashboard.all,
    ],
  },
  masterData: {
    categories: () => [
      QueryKeys.masterData.categories.all,
      QueryKeys.items.all,
    ],
    types: () => [QueryKeys.masterData.types.all, QueryKeys.items.all],
    packages: () => [QueryKeys.masterData.packages.all, QueryKeys.items.all],
    suppliers: () => [
      QueryKeys.masterData.suppliers.all,
      QueryKeys.purchases.all,
    ],
    dosages: () => [QueryKeys.masterData.dosages.all, QueryKeys.items.all],
    manufacturers: () => [
      QueryKeys.masterData.manufacturers.all,
      QueryKeys.items.all,
    ],
    itemUnits: () => [QueryKeys.masterData.itemUnits.all, QueryKeys.items.all],
  },
  patients: {
    all: () => [QueryKeys.patients.all],
    related: () => [QueryKeys.patients.all, QueryKeys.sales.all],
  },
  doctors: {
    all: () => [QueryKeys.doctors.all],
    related: () => [QueryKeys.doctors.all, QueryKeys.sales.all],
  },
  customers: {
    all: () => [QueryKeys.customers.all],
    related: () => [QueryKeys.customers.all, QueryKeys.sales.all],
  },
} as const;
