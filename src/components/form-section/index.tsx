import classNames from 'classnames';
import type { FormSectionProps } from '@/types';

const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  className,
}) => {
  return (
    <div
      className={classNames(
        'border-2 border-slate-200 rounded-lg mb-6 overflow-hidden',
        className
      )}
    >
      <h2 className="text-lg font-semibold bg-slate-100 p-3 border-b-2 border-slate-200">
        {title}
      </h2>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
};

export default FormSection;
