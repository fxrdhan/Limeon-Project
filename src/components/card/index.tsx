import type { CardProps } from '@/types';
import classNames from 'classnames';

export const Card = ({ children, className }: CardProps) => {
  return (
    <div
      className={classNames(
        'p-6 outline-none bg-white shadow-lg rounded-xl!',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: CardProps) => {
  return (
    <div
      className={
        className ||
        'mb-4 bg-slate-100! rounded-t-xl border-b-2 border-slate-200'
      }
    >
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className }: CardProps) => {
  return (
    <h2
      className={
        className || 'text-2xl font-semibold text-slate-800 outline-none'
      }
    >
      {children}
    </h2>
  );
};

export const CardContent = ({ children, className }: CardProps) => {
  return <div className={classNames('', className)}>{children}</div>;
};

export const CardFooter = ({ children, className }: CardProps) => {
  return (
    <div
      className={classNames(
        'mt-0 pt-4 rounded-b-xl border-t-2! border-slate-200',
        className
      )}
    >
      {children}
    </div>
  );
};
