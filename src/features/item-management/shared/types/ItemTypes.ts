// Business Entity Types
export interface UnitData {
  id: string;
  kode?: string;
  name: string;
}

export interface UnitOption {
  id: string;
  kode?: string;
  name: string;
}

export interface EntityData {
  id: string;
  kode?: string;
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
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
}

export interface PackageConversion {
  id: string;
  unit_name: string;
  to_unit_id: string;
  unit: UnitData;
  conversion: number;
  basePrice: number;
  sellPrice: number;
  conversion_rate: number;
}

export interface DBPackageConversion {
  id?: string;
  unit_name: string;
  to_unit_id?: string;
  conversion_rate: number;
  base_price?: number;
  sell_price?: number;
}
