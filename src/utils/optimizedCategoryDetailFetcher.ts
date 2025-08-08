import type { HoverDetailData, DropdownOption } from '@/types';

/**
 * Optimized category detail fetcher that uses cached realtime data
 * instead of making database requests
 */
export const createOptimizedCategoryDetailFetcher = (categories: DropdownOption[]) => {
  return async (categoryId: string): Promise<HoverDetailData | null> => {
    try {
      // Find category in cached data (no database request needed!)
      const category = categories.find(cat => cat.id === categoryId);
      
      if (!category) {
        console.warn(`Category with ID ${categoryId} not found in cached data`);
        return null;
      }

      // Return formatted data immediately (no database request needed!)
      return {
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
        created_at: undefined, // Not needed for hover display
        updated_at: category.updated_at,
      };
    } catch (error) {
      console.error('Error getting category detail from cache:', error);
      return null;
    }
  };
};

/**
 * Optimized type detail fetcher that uses cached realtime data
 * instead of making database requests
 */
export const createOptimizedTypeDetailFetcher = (types: DropdownOption[]) => {
  return async (typeId: string): Promise<HoverDetailData | null> => {
    try {
      // Find type in cached data (no database request needed!)
      const type = types.find(t => t.id === typeId);
      
      if (!type) {
        console.warn(`Type with ID ${typeId} not found in cached data`);
        return null;
      }

      // Return formatted data immediately (no database request needed!)
      return {
        id: type.id,
        code: type.code,
        name: type.name,
        description: type.description,
        created_at: undefined, // Not needed for hover display
        updated_at: type.updated_at,
      };
    } catch (error) {
      console.error('Error getting type detail from cache:', error);
      return null;
    }
  };
};

/**
 * Optimized unit detail fetcher that uses cached realtime data
 * instead of making database requests
 */
export const createOptimizedUnitDetailFetcher = (units: DropdownOption[]) => {
  return async (unitId: string): Promise<HoverDetailData | null> => {
    try {
      // Find unit in cached data (no database request needed!)
      const unit = units.find(u => u.id === unitId);
      
      if (!unit) {
        console.warn(`Unit with ID ${unitId} not found in cached data`);
        return null;
      }

      // Return formatted data immediately (no database request needed!)
      return {
        id: unit.id,
        code: unit.code,
        name: unit.name,
        description: unit.description,
        created_at: undefined, // Not needed for hover display
        updated_at: unit.updated_at,
      };
    } catch (error) {
      console.error('Error getting unit detail from cache:', error);
      return null;
    }
  };
};

/**
 * Optimized dosage detail fetcher that uses cached realtime data
 * instead of making database requests
 */
export const createOptimizedDosageDetailFetcher = (dosages: DropdownOption[]) => {
  return async (dosageId: string): Promise<HoverDetailData | null> => {
    try {
      // Find dosage in cached data (no database request needed!)
      const dosage = dosages.find(d => d.id === dosageId);
      
      if (!dosage) {
        console.warn(`Dosage with ID ${dosageId} not found in cached data`);
        return null;
      }

      // Return formatted data immediately (no database request needed!)
      return {
        id: dosage.id,
        code: dosage.code,
        name: dosage.name,
        description: dosage.description,
        created_at: undefined, // Not needed for hover display
        updated_at: dosage.updated_at,
      };
    } catch (error) {
      console.error('Error getting dosage detail from cache:', error);
      return null;
    }
  };
};

/**
 * Optimized manufacturer detail fetcher that uses cached realtime data
 * instead of making database requests. Uses address field instead of description.
 */
export const createOptimizedManufacturerDetailFetcher = (manufacturers: DropdownOption[]) => {
  return async (manufacturerId: string): Promise<HoverDetailData | null> => {
    try {
      // Find manufacturer in cached data (no database request needed!)
      const manufacturer = manufacturers.find(m => m.id === manufacturerId);
      
      if (!manufacturer) {
        console.warn(`Manufacturer with ID ${manufacturerId} not found in cached data`);
        return null;
      }

      // Return formatted data immediately (no database request needed!)
      // Use address field as description for manufacturers
      return {
        id: manufacturer.id,
        code: manufacturer.code,
        name: manufacturer.name,
        description: manufacturer.description, // This will be the address field
        created_at: undefined, // Not needed for hover display
        updated_at: manufacturer.updated_at,
      };
    } catch (error) {
      console.error('Error getting manufacturer detail from cache:', error);
      return null;
    }
  };
};