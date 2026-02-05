import Button from '@/components/button';
import type { FormActionProps } from '@/types';

const FormAction: React.FC<FormActionProps> = ({
  onCancel,
  onDelete,
  isSaving,
  isDeleting,
  isDisabled = false,
  isSubmitDisabled,
  cancelText = 'Batal',
  saveText = 'Simpan',
  updateText = 'Update',
  deleteText = 'Hapus',
  isEditMode = false,
  cancelTabIndex,
  saveTabIndex,
}) => {
  const submitDisabled = isSubmitDisabled ?? isDisabled;

  return (
    <div className="flex justify-between w-full">
      <div>
        {isEditMode && onDelete ? (
          <Button
            type="button"
            variant="text-danger"
            onClick={onDelete}
            isLoading={isDeleting}
            tabIndex={cancelTabIndex}
            disabled={isSaving || isDeleting}
          >
            {deleteText}
          </Button>
        ) : (
          <Button
            type="button"
            variant="text"
            onClick={onCancel}
            tabIndex={cancelTabIndex}
            disabled={isSaving || isDisabled}
          >
            {cancelText}
          </Button>
        )}
      </div>
      <div>
        <Button
          type="submit"
          variant="primary"
          disabled={isSaving || isDeleting || submitDisabled}
          tabIndex={saveTabIndex}
          isLoading={isSaving}
        >
          {isEditMode ? updateText : saveText}
        </Button>
      </div>
    </div>
  );
};

export default FormAction;
