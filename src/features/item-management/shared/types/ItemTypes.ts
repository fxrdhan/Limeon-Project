// Business Entity Types
import type { ItemInventoryUnit } from '@/types/database';
export interface EntityData {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  address?: string | null;
  updated_at?: string | null;
}

export interface VersionData {
  id: string;
  version_number: number;
  action_type: string;
  changed_at: string;
  changed_by?: string | null;
  user_name?: string | null;
  user_photo?: string | null;
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
}

export interface PackageConversion {
  id: string;
  unit_name: string;
  to_unit_id: string;
  inventory_unit_id?: string;
  parent_inventory_unit_id?: string | null;
  contains_quantity?: number;
  factor_to_base?: number;
  base_price_override?: number | null;
  sell_price_override?: number | null;
  unit: ItemInventoryUnit;
  conversion_rate: number;
  base_price: number;
  sell_price: number;
}

export interface DBPackageConversion {
  id?: string;
  unit_name: string;
  to_unit_id?: string;
  conversion_rate: number;
  base_price?: number;
  sell_price?: number;
}
