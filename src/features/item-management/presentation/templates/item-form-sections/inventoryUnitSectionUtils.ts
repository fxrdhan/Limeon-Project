export const enrichInventoryUnitsWithDosageDetails = <
  T extends {
    code?: string;
    description?: string | null;
    source_dosage_id?: string | null;
    updated_at?: string | null;
  },
>(
  inventoryUnits: T[],
  dosages: Array<{
    id: string;
    code?: string;
    description?: string;
    updated_at?: string | null;
  }>
) =>
  inventoryUnits.map(unit => {
    if (!unit.source_dosage_id) return unit;

    const dosage = dosages.find(item => item.id === unit.source_dosage_id);
    if (!dosage) return unit;

    return {
      ...unit,
      code: dosage.code || unit.code,
      description: dosage.description ?? unit.description ?? null,
      updated_at: dosage.updated_at ?? unit.updated_at ?? null,
    };
  });
