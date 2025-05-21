import { Button } from '@/components/modules';
import type { FormActionProps } from '@/types';

export const FormAction: React.FC<FormActionProps> = ({
    onCancel,
    isSaving,
    isDisabled = false,
    cancelText = 'Batal',
    saveText = 'Simpan'
}) => {
    return (
        <div className="flex justify-between w-full">
            <Button
                type="button"
                variant="outline"
                onClick={onCancel}
            >
                <span>{cancelText}</span>
            </Button>
            <Button 
                type="submit"
                disabled={isSaving || isDisabled}
                isLoading={isSaving}
            >
                {saveText}
            </Button>
        </div>
    );
};