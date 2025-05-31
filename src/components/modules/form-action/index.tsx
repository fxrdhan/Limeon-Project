import Button from '@/components/modules/button';
import type { FormActionProps } from '@/types';

const FormAction: React.FC<FormActionProps> = ({
    onCancel,
    onDelete,
    isSaving,
    isDeleting,
    isDisabled = false,
    cancelText = 'Batal',
    saveText = 'Simpan',
    updateText = 'Update',
    deleteText = 'Hapus',
    isEditMode = false,
    cancelTabIndex,
    saveTabIndex,
}) => {
    return (
        <div className="flex justify-between w-full">
            <div>
                {isEditMode && onDelete ? (
                    <Button
                        type="button"
                        variant="danger"
                        onClick={onDelete}
                        isLoading={isDeleting}
                        tabIndex={cancelTabIndex}
                        disabled={isSaving || isDeleting || isDisabled}
                    >
                        {deleteText}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
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
                    disabled={isSaving || isDeleting || isDisabled}
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