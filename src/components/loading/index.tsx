import type { LoadingProps } from '@/types';
import classNames from 'classnames';

const Loading = ({ className, message = '' }: LoadingProps) => (
  <div className={classNames('text-center py-6', className)}>
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
    <p className="mt-2 text-slate-600">{message}</p>
  </div>
);

export default Loading;
