// src/components/ui/FormComponents.tsx
import { classNames } from "../../lib/classNames";

// FormSection component
interface FormSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children, className }) => {
    return (
        <div className={classNames("border border-gray-200 rounded-lg mb-6", className)}>
            <h2 className="text-lg font-semibold bg-gray-100 p-3 border-b">
                {title}
            </h2>
            <div className="p-4 space-y-4">
                {children}
            </div>
        </div>
    );
};

// FormField component
interface FormFieldProps {
    label: string;
    children: React.ReactNode;
    className?: string;
}

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