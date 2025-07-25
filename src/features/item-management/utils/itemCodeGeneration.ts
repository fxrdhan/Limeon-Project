import { supabase } from "@/lib/supabase";
import type { Category, MedicineType, Unit } from "@/types";

/**
 * Generates type code based on medicine type
 */
export const generateTypeCode = (
  typeId: string,
  types: MedicineType[],
): string => {
  const selectedType = types.find((type) => type.id === typeId);
  if (!selectedType) return "X";

  const typeName = selectedType.name.toLowerCase();
  if (typeName.includes("bebas") && !typeName.includes("terbatas")) return "B";
  if (typeName.includes("bebas terbatas")) return "T";
  if (typeName.includes("keras")) return "K";
  if (typeName.includes("narkotika")) return "N";
  if (typeName.includes("fitofarmaka")) return "F";
  if (typeName.includes("herbal")) return "H";

  return selectedType.name.charAt(0).toUpperCase();
};

/**
 * Generates unit code based on unit
 */
export const generateUnitCode = (unitId: string, units: Unit[]): string => {
  const selectedUnit = units.find((unit) => unit.id === unitId);
  if (!selectedUnit) return "X";

  return selectedUnit.name.charAt(0).toUpperCase();
};

/**
 * Generates category code with smart handling for "anti" prefix
 */
export const generateCategoryCode = (
  categoryId: string,
  categories: Category[],
): string => {
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  if (!selectedCategory) return "XX";

  const name = selectedCategory.name;

  if (name.toLowerCase().startsWith("anti")) {
    const baseName = name.slice(4);
    if (baseName.length > 0) {
      return "A" + baseName.charAt(0).toUpperCase();
    }
    return "A";
  } else {
    if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    } else if (name.length === 1) {
      return name.toUpperCase() + "X";
    } else {
      return "XX";
    }
  }
};

/**
 * Generates complete item code prefix
 */
export const generateCodePrefix = (
  typeId: string,
  unitId: string,
  categoryId: string,
  types: MedicineType[],
  units: Unit[],
  categories: Category[],
): string => {
  const typeCode = generateTypeCode(typeId, types);
  const unitCode = generateUnitCode(unitId, units);
  const categoryCode = generateCategoryCode(categoryId, categories);
  return `${typeCode}${unitCode}${categoryCode}`;
};

/**
 * Finds next available sequence number for given prefix
 */
export const findNextSequence = (
  existingCodes: string[],
  codePrefix: string,
): number => {
  if (!existingCodes.length) return 1;

  const usedSequences = new Set<number>();

  existingCodes.forEach(code => {
    const sequenceStr = code.substring(codePrefix.length);
    const sequenceNum = parseInt(sequenceStr);
    if (!isNaN(sequenceNum)) {
      usedSequences.add(sequenceNum);
    }
  });

  let sequence = 1;
  while (usedSequences.has(sequence)) {
    sequence++;
  }

  return sequence;
};

/**
 * Generates complete item code with sequence
 */
export const generateCompleteItemCode = async (
  typeId: string,
  unitId: string,
  categoryId: string,
  types: MedicineType[],
  units: Unit[],
  categories: Category[],
  excludeItemId?: string,
): Promise<string> => {
  const codePrefix = generateCodePrefix(
    typeId,
    unitId,
    categoryId,
    types,
    units,
    categories,
  );

  // Build query to get existing codes with same prefix
  let query = supabase
    .from("items")
    .select("code")
    .ilike("code", `${codePrefix}%`)
    .order("code", { ascending: true });

  // Exclude current item if editing
  if (excludeItemId) {
    query = query.neq("id", excludeItemId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const existingCodes = data?.map(item => item.code) || [];
  const sequence = findNextSequence(existingCodes, codePrefix);
  const sequenceStr = sequence.toString().padStart(2, "0");

  return `${codePrefix}${sequenceStr}`;
};

/**
 * Attempts to preserve existing code during edit if possible
 */
export const generateItemCodeForEdit = async (
  typeId: string,
  unitId: string,
  categoryId: string,
  types: MedicineType[],
  units: Unit[],
  categories: Category[],
  currentCode: string,
  itemName: string,
  initialItemName: string,
  itemId: string,
): Promise<{ code: string; wasPreserved: boolean }> => {
  const codePrefix = generateCodePrefix(
    typeId,
    unitId,
    categoryId,
    types,
    units,
    categories,
  );

  // If item name hasn't changed, try to preserve existing code
  if (itemName === initialItemName && currentCode.startsWith(codePrefix)) {
    const currentSequenceStr = currentCode.substring(codePrefix.length);
    const currentSequenceNum = parseInt(currentSequenceStr);

    if (!isNaN(currentSequenceNum)) {
      // Check if current sequence is still available
      const { data } = await supabase
        .from("items")
        .select("code")
        .ilike("code", `${codePrefix}%`)
        .neq("id", itemId)
        .order("code", { ascending: true });

      const existingCodes = data?.map(item => item.code) || [];
      const isCurrentSequenceAvailable = !existingCodes.some(code => {
        const sequenceStr = code.substring(codePrefix.length);
        const sequenceNum = parseInt(sequenceStr);
        return !isNaN(sequenceNum) && sequenceNum === currentSequenceNum;
      });

      if (isCurrentSequenceAvailable) {
        return { code: currentCode, wasPreserved: true };
      }
    }
  }

  // Generate new code
  const newCode = await generateCompleteItemCode(
    typeId,
    unitId,
    categoryId,
    types,
    units,
    categories,
    itemId,
  );

  return { code: newCode, wasPreserved: false };
};