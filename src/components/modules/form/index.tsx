import { classNames } from "@/lib/classNames";
import type { FormSectionProps, FormFieldProps } from '@/types';

export const FormSection: React.FC<FormSectionProps> = ({ title, children, className }) => {
    return (
        <div className={classNames("border border-gray-200 rounded-lg mb-6", className)}>
            <h2 className="text-lg font-semibold bg-gray-100 p-3 border-b rounded-t-lg">
                {title}
            </h2>
            <div className="p-4 space-y-4">
                {children}
            </div>
        </div>
    );
};

export const FormField: React.FC<FormFieldProps> = ({ label, children, className }) => {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            {children}
        </div>
    );
};