import type { FormFieldProps } from '@/types';

const FormField: React.FC<FormFieldProps> = ({ label, children, className }) => {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            {children}
        </div>
    );
};

export default FormField;