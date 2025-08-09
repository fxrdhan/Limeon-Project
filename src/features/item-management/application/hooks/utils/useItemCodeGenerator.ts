import { useMemo } from 'react';
import type { DropdownOption } from '@/types/components';

interface UseItemCodeGeneratorProps {
  categoryId: string;
  typeId: string;
  packageId: string;
  dosageId: string;
  manufacturerId: string;
  categories: DropdownOption[];
  types: DropdownOption[];
  packages: DropdownOption[];
  dosages: DropdownOption[];
  manufacturers: DropdownOption[];
}

interface CodeGenerationResult {
  generatedCode: string;
  isComplete: boolean;
  missingFields: string[];
}

export function useItemCodeGenerator({
  categoryId,
  typeId,
  packageId,
  dosageId,
  manufacturerId,
  categories,
  types,
  packages,
  dosages,
  manufacturers,
}: UseItemCodeGeneratorProps): CodeGenerationResult {
  return useMemo(() => {
    const missingFields: string[] = [];
    const codeParts: string[] = [];

    // Find codes for each selected item
    const categoryCode = categories.find(cat => cat.id === categoryId)?.code;
    const typeCode = types.find(type => type.id === typeId)?.code;
    const packageCode = packages.find(pkg => pkg.id === packageId)?.code;
    const dosageCode = dosages.find(dos => dos.id === dosageId)?.code;
    const manufacturerCode = manufacturers.find(mfr => mfr.id === manufacturerId)?.code;

    // Check which fields are missing
    if (!categoryId || !categoryCode) {
      missingFields.push('Kategori');
    } else {
      codeParts.push(categoryCode);
    }

    if (!typeId || !typeCode) {
      missingFields.push('Jenis');
    } else {
      codeParts.push(typeCode);
    }

    if (!packageId || !packageCode) {
      missingFields.push('Kemasan');
    } else {
      codeParts.push(packageCode);
    }

    if (!dosageId || !dosageCode) {
      missingFields.push('Sediaan');
    } else {
      codeParts.push(dosageCode);
    }

    if (!manufacturerId || !manufacturerCode) {
      missingFields.push('Produsen');
    } else {
      codeParts.push(manufacturerCode);
    }

    const isComplete = missingFields.length === 0;
    const generatedCode = isComplete 
      ? `${codeParts.join('-')}-[XXX]` 
      : codeParts.length > 0 
        ? `${codeParts.join('-')}-...` 
        : '';

    return {
      generatedCode,
      isComplete,
      missingFields,
    };
  }, [
    categoryId,
    typeId,
    packageId,
    dosageId,
    manufacturerId,
    categories,
    types,
    packages,
    dosages,
    manufacturers,
  ]);
}

export async function generateItemCodeWithSequence(
  baseCode: string,
  checkExistingCodesFn: (pattern: string) => Promise<string[]>
): Promise<string> {
  // Get existing codes that match the base pattern
  const existingCodes = await checkExistingCodesFn(`${baseCode}-%`);
  
  // Extract sequence numbers from existing codes
  const sequenceNumbers = existingCodes
    .map(code => {
      const parts = code.split('-');
      const lastPart = parts[parts.length - 1];
      return parseInt(lastPart, 10);
    })
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);

  // Find the lowest available sequence number
  let nextSequence = 0;
  for (const num of sequenceNumbers) {
    if (num === nextSequence) {
      nextSequence++;
    } else {
      break;
    }
  }

  // Format sequence number with leading zeros (e.g., 000, 001, 002)
  const formattedSequence = nextSequence.toString().padStart(3, '0');
  
  return `${baseCode}-${formattedSequence}`;
}