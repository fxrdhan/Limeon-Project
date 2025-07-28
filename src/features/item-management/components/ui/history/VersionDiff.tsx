import React from "react";
import { FaArrowRight } from "react-icons/fa";
import type { VersionData } from "../../../types";
import DiffText from "./DiffText";

interface LocalVersionDiffProps {
  fromVersion: VersionData;
  toVersion: VersionData;
  entityName: string;
  entityType?: string; // Optional entity type for field-specific handling
}

const VersionDiff: React.FC<LocalVersionDiffProps> = ({
  fromVersion,
  toVersion,
  entityName,
  entityType = 'generic',
}) => {
  const changedFields = toVersion.changed_fields || {};
  const allFields = new Set([
    ...Object.keys(fromVersion.entity_data),
    ...Object.keys(toVersion.entity_data),
  ]);

  // Define text fields by entity type
  const getTextFields = (entityType: string): Set<string> => {
    switch (entityType) {
      case 'items':
        return new Set(['name', 'description', 'code', 'rack', 'base_unit', 'barcode', 'manufacturer']);
      // Add other entity types as needed
      default:
        return new Set();
    }
  };

  const textFields = getTextFields(entityType);

  // Helper function to check if field should use diff
  const shouldUseDiff = (field: string): boolean => {
    return textFields.has(field);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const isFieldChanged = (field: string) => {
    return Object.keys(changedFields).includes(field);
  };

  const getFieldStyle = (field: string) => {
    if (isFieldChanged(field)) {
      return "bg-yellow-50 border-l-4 border-yellow-400";
    }
    return "bg-gray-50";
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
            v{fromVersion.version_number}
          </span>
          <FaArrowRight className="text-gray-400" size={12} />
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
            v{toVersion.version_number}
          </span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Perbandingan perubahan {entityName}
        </p>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Array.from(allFields)
          .filter(field => !field.includes('_at') && field !== 'id') // Hide timestamps and ID
          .map((field) => {
            const fromValue = fromVersion.entity_data[field];
            const toValue = toVersion.entity_data[field];
            const hasChanged = isFieldChanged(field);

            return (
              <div key={field} className={`rounded-lg p-3 ${getFieldStyle(field)}`}>
                <div className="font-medium text-sm mb-2 capitalize">
                  {field.replace(/_/g, ' ')}
                  {hasChanged && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      Changed
                    </span>
                  )}
                </div>
                
                {hasChanged && shouldUseDiff(field) ? (
                  /* Text fields - Use DiffText component */
                  <div className="bg-white border border-gray-200 rounded p-3">
                    <div className="text-xs text-gray-500 mb-2">
                      Perubahan v{fromVersion.version_number} → v{toVersion.version_number}:
                    </div>
                    <DiffText 
                      oldText={formatValue(fromValue)}
                      newText={formatValue(toValue)}
                      mode="smart"
                      className="w-full"
                    />
                  </div>
                ) : (
                  /* Non-text fields or unchanged fields - Use side-by-side comparison */
                  <div className="grid grid-cols-2 gap-4">
                    {/* From Version */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        v{fromVersion.version_number}
                      </div>
                      <div className={`text-sm p-2 rounded border ${
                        hasChanged 
                          ? "bg-red-50 border-red-200 text-red-800" 
                          : "bg-gray-100 border-gray-200"
                      }`}>
                        <code className="whitespace-pre-wrap">
                          {formatValue(fromValue)}
                        </code>
                      </div>
                    </div>

                    {/* To Version */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        v{toVersion.version_number}
                      </div>
                      <div className={`text-sm p-2 rounded border ${
                        hasChanged 
                          ? "bg-green-50 border-green-200 text-green-800" 
                          : "bg-gray-100 border-gray-200"
                      }`}>
                        <code className="whitespace-pre-wrap">
                          {formatValue(toValue)}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {Object.keys(changedFields).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Tidak ada perubahan data antara versi ini</p>
        </div>
      )}
    </div>
  );
};

export default VersionDiff;