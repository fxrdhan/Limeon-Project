import React from 'react';
import { TbHistory, TbLoader2 } from 'react-icons/tb';
import Button from '@/components/button';
import IdentityImageUploader from './IdentityImageUploader';
import IdentityFormField from './IdentityFormField';
import { useIdentityModalContext } from '@/contexts/IdentityModalContext';

const IdentityModalContent: React.FC = () => {
  const {
    title,
    mode,
    formattedUpdateAt,
    fields,
    isSubmitting,
    localData,
    onDeleteRequest,
    deleteButtonLabel,
    handleSaveAll,
    handleCloseModal,
  } = useIdentityModalContext();

  return (
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden relative mx-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">{title}</h2>
          {mode === 'edit' && formattedUpdateAt !== '-' && (
            <span className="text-sm text-gray-500 italic flex items-center mt-1">
              <TbHistory className="mr-1" size={12} />
              {formattedUpdateAt}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <IdentityImageUploader />

        <div className="space-y-4">
          {fields.map(field => (
            <IdentityFormField key={field.key} field={field} />
          ))}
        </div>
      </div>

      {/* Footer */}
      {mode === 'edit' ? (
        <div className="p-4 border-t flex justify-between items-center bg-white">
          {onDeleteRequest && (
            <Button variant="danger" onClick={() => onDeleteRequest(localData)}>
              {deleteButtonLabel}
            </Button>
          )}
          <Button type="button" variant="text" onClick={handleCloseModal}>
            Tutup
          </Button>
        </div>
      ) : (
        <div className="p-4 border-t flex justify-between items-center bg-white">
          <Button type="button" variant="text" onClick={handleCloseModal}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveAll}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <TbLoader2 className="animate-spin mr-2" />
                Menyimpan...
              </span>
            ) : (
              'Simpan'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default IdentityModalContent;
