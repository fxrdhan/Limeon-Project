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
    return String(entityData?.code || '');
  };

  // Get original data for diff computation (never changes, prevents recomputation)
  const getOriginalComparisonData = () => {
    if (isDualMode && versionA && versionB) {
      const versionAData = versionA.entity_data;
      const versionBData = versionB.entity_data;
      const isManufacturer = entityName === 'Produsen';
      return {
        originalLeftKode: getCodeField(versionAData),
        originalLeftName: String(versionAData?.name || ''),
        originalLeftDescription: String(
          isManufacturer
            ? versionAData?.address || ''
            : versionAData?.description || ''
        ),
        originalRightKode: getCodeField(versionBData),
        originalRightName: String(versionBData?.name || ''),
        originalRightDescription: String(
          isManufacturer
            ? versionBData?.address || ''
            : versionBData?.description || ''
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
        leftName: String(versionAData?.name || ''),
        leftDescription: String(
          isManufacturer
            ? versionAData?.address || ''
            : versionAData?.description || ''
        ),
        rightKode: getCodeField(versionBData),
        rightName: String(versionBData?.name || ''),
        rightDescription: String(
          isManufacturer
            ? versionBData?.address || ''
            : versionBData?.description || ''
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
      const versionName = String(versionData?.name || '');
      const versionDescription = String(
        isManufacturer
          ? versionData?.address || ''
          : versionData?.description || ''
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
