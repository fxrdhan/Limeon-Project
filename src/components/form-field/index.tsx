import React, { cloneElement, isValidElement, useId } from 'react';
import type { FormFieldProps } from '@/types';

const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  className,
  required = false,
}) => {
  const generatedId = useId().replace(/[^A-Za-z0-9_-]/g, '-');
  const labelId = `${generatedId}-label`;
  const canAssociateChild =
    isValidElement(children) && typeof children.type !== 'string';
  const childProps = canAssociateChild
    ? (children.props as {
        id?: string;
        'aria-labelledby'?: string;
      })
    : {};
  const controlId = childProps.id ?? `${generatedId}-control`;
  const labelledBy = [labelId, childProps['aria-labelledby']]
    .filter(Boolean)
    .join(' ');
  const content = canAssociateChild
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: controlId,
        'aria-labelledby': labelledBy,
      })
    : children;

  return (
    <div className={className}>
      <label
        id={labelId}
        htmlFor={canAssociateChild ? controlId : undefined}
        className="block text-sm font-medium text-slate-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {content}
    </div>
  );
};

export default FormField;
