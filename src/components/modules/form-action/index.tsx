import { Button } from '@/components/modules';
import type { FormActionProps } from '@/types';

export const FormAction: React.FC<FormActionProps> = ({
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
                        disabled={isSaving || isDeleting || isDisabled}
                    >
                        {deleteText}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
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
                    isLoading={isSaving}
                >
                    {isEditMode ? updateText : saveText}
                </Button>
            </div>
        </div>
    );
};