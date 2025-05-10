import { Button } from '@/components/ui/button';
import { FaSave, FaTimes } from 'react-icons/fa';
import type { FormActionsProps } from '@/types';

export const FormActions: React.FC<FormActionsProps> = ({
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
                <div className="flex items-center">
                    <FaTimes className="mr-2" /> <span>{cancelText}</span>
                </div>
            </Button>
            <Button 
                type="submit"
                disabled={isSaving || isDisabled}
                isLoading={isSaving}
            >
                <FaSave className="mr-2" /> {saveText}
            </Button>
        </div>
    );
};