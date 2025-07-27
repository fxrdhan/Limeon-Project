import React, { useEffect } from "react";
import Input from "@/components/input";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import { useEntityModal } from "../../../contexts/EntityModalContext";

const VersionDetailContent: React.FC = () => {
  const { form, ui, action, formActions, history } = useEntityModal();
  const { name, description } = form;
  const { entityName } = ui;
  const { isLoading } = action;
  const { setName, setDescription } = formActions;
  const { selectedVersion } = history;

  // Populate form with version data
  useEffect(() => {
    if (selectedVersion?.entity_data) {
      const versionData = selectedVersion.entity_data;
      setName(String(versionData.name || ''));
      setDescription(String(versionData.description || ''));
    }
  }, [selectedVersion, setName, setDescription]);

  const isReadOnly = isLoading;

  return (
    <div className="p-6 space-y-4">
      {/* Version Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono bg-blue-100 px-2 py-1 rounded">
            v{selectedVersion?.version_number}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            selectedVersion?.action_type === 'INSERT' ? 'bg-green-100 text-green-700' :
            selectedVersion?.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>
            {selectedVersion?.action_type}
          </span>
          <span className="text-xs text-gray-600">
            {selectedVersion?.changed_at && new Date(selectedVersion.changed_at).toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Form Fields */}
      <Input
        label={`Nama ${entityName}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Masukkan nama ${entityName.toLowerCase()}`}
        required
        readOnly={isReadOnly}
      />

      <DescriptiveTextarea
        label="Deskripsi"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Masukkan deskripsi singkat"
        readOnly={isReadOnly}
        textareaClassName="text-sm min-h-[80px] resize-none"
        rows={3}
        showInitially={!!description}
        expandOnClick={true}
      />
    </div>
  );
};

export default VersionDetailContent;