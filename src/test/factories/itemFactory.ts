/**
 * Test Data Factory - Items
 *
 * Provides factory functions to generate test data for items
 * with realistic and customizable properties.
 */

// Define Item type for test purposes
export interface Item {
  id: string;
  category_id: string;
  type_id: string;
  unit_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  code: string;
  barcode: string | null;
  manufacturer: string;
  is_medicine: boolean;
  base_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  image_url: string | null;
}

let itemIdCounter = 1;

/**
 * Default item data
 */
const defaultItemData: Partial<Item> = {
  name: 'Test Item',
  code: 'ITM001',
  barcode: '1234567890123',
  manufacturer: 'Test Manufacturer',
  is_medicine: true,
  base_price: 10000,
  sell_price: 12000,
  stock: 100,
  min_stock: 10,
  description: 'Test item description',
  notes: null,
  is_active: true,
  image_url: null,
};

/**
 * Creates a mock item with custom overrides
 */
export const createMockItem = (overrides: Partial<Item> = {}): Item => {
  const id = `item-${itemIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    category_id: 'cat-1',
    type_id: 'type-1',
    unit_id: 'unit-1',
    created_at: now,
    updated_at: now,
    ...defaultItemData,
    ...overrides,
  } as Item;
};

/**
 * Creates multiple mock items
 */
export const createMockItems = (
  count: number,
  overrides: Partial<Item> = {}
): Item[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockItem({
      code: `ITM${String(index + 1).padStart(3, '0')}`,
      name: `Test Item ${index + 1}`,
      ...overrides,
    })
  );
};

/**
 * Creates a low stock item
 */
export const createLowStockItem = (overrides: Partial<Item> = {}): Item => {
  return createMockItem({
    stock: 5,
    min_stock: 10,
    ...overrides,
  });
};

/**
 * Creates an out of stock item
 */
export const createOutOfStockItem = (overrides: Partial<Item> = {}): Item => {
  return createMockItem({
    stock: 0,
    min_stock: 10,
    ...overrides,
  });
};

/**
 * Creates a medicine item
 */
export const createMedicineItem = (overrides: Partial<Item> = {}): Item => {
  return createMockItem({
    is_medicine: true,
    name: 'Paracetamol 500mg',
    code: 'MED001',
    ...overrides,
  });
};

/**
 * Creates a non-medicine item
 */
export const createNonMedicineItem = (overrides: Partial<Item> = {}): Item => {
  return createMockItem({
    is_medicine: false,
    name: 'Masker N95',
    code: 'NON001',
    ...overrides,
  });
};

/**
 * Creates items with different price ranges
 */
export const createPricedItems = () => ({
  cheap: createMockItem({ base_price: 1000, sell_price: 1200 }),
  medium: createMockItem({ base_price: 50000, sell_price: 60000 }),
  expensive: createMockItem({ base_price: 500000, sell_price: 600000 }),
});

/**
 * Resets the item counter (useful for test isolation)
 */
export const resetItemCounter = () => {
  itemIdCounter = 1;
};
