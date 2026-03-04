import type { VersionData } from '../../../../shared/types';

interface UseComparisonDataProps {
  isDualMode: boolean;
  selectedVersion?: VersionData;
  currentData: {
    code?: string;
    name: string;
    description: string;
  };
  versionA?: VersionData;
  versionB?: VersionData;
  entityName: string;
}

const toSafeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
};

export const useComparisonData = ({
  isDualMode,
  selectedVersion,
  currentData,
  versionA,
  versionB,
  entityName,
}: UseComparisonDataProps) => {
  // Helper function to get code field from entity data (all tables now use 'code')
  const getCodeField = (
    entityData: Record<string, unknown> | undefined | null
  ) => {
    return toSafeString(entityData?.code);
  };

  // Get original data for diff computation (never changes, prevents recomputation)
  const getOriginalComparisonData = () => {
    if (isDualMode && versionA && versionB) {
      const versionAData = versionA.entity_data;
      const versionBData = versionB.entity_data;
      const isManufacturer = entityName === 'Produsen';
      return {
        originalLeftKode: getCodeField(versionAData),
        originalLeftName: toSafeString(versionAData?.name),
        originalLeftDescription: toSafeString(
          isManufacturer ? versionAData?.address : versionAData?.description
        ),
        originalRightKode: getCodeField(versionBData),
        originalRightName: toSafeString(versionBData?.name),
        originalRightDescription: toSafeString(
          isManufacturer ? versionBData?.address : versionBData?.description
        ),
      };
    }
    return null;
  };

  // Get comparison data based on mode
  const getComparisonData = () => {
    const isManufacturer = entityName === 'Produsen';

    if (isDualMode && versionA && versionB) {
      const versionAData = versionA.entity_data;
      const versionBData = versionB.entity_data;
      return {
        leftKode: getCodeField(versionAData),
        leftName: toSafeString(versionAData?.name),
        leftDescription: toSafeString(
          isManufacturer ? versionAData?.address : versionAData?.description
        ),
        rightKode: getCodeField(versionBData),
        rightName: toSafeString(versionBData?.name),
        rightDescription: toSafeString(
          isManufacturer ? versionBData?.address : versionBData?.description
        ),
        leftVersion: versionA,
        rightVersion: versionB,
        isKodeDifferent:
          getCodeField(versionA.entity_data) !==
          getCodeField(versionB.entity_data),
        isNameDifferent:
          versionA.entity_data?.name !== versionB.entity_data?.name,
        isDescriptionDifferent: isManufacturer
          ? versionA.entity_data?.address !== versionB.entity_data?.address
          : versionA.entity_data?.description !==
            versionB.entity_data?.description,
      };
    } else if (selectedVersion) {
      const versionData = selectedVersion.entity_data;
      const versionKode = getCodeField(versionData);
      const versionName = toSafeString(versionData?.name);
      const versionDescription = toSafeString(
        isManufacturer ? versionData?.address : versionData?.description
      );
      return {
        leftKode: versionKode,
        leftName: versionName,
        leftDescription: versionDescription,
        rightKode: currentData.code || '',
        rightName: currentData.name,
        rightDescription: currentData.description,
        leftVersion: selectedVersion,
        rightVersion: null,
        isKodeDifferent: (currentData.code || '') !== versionKode,
        isNameDifferent: currentData.name !== versionName,
        isDescriptionDifferent: currentData.description !== versionDescription,
      };
    }
    return null;
  };

  const compData = getComparisonData();
  const originalData = getOriginalComparisonData();

  return {
    compData,
    originalData,
  };
};
