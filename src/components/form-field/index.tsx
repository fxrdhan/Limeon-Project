import type { FormFieldProps } from '@/types';

const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  className,
  required = false,
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
};

export default FormField;
