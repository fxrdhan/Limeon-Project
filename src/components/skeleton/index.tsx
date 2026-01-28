import classNames from 'classnames';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton = ({ className, width, height }: SkeletonProps) => {
  return (
    <div
      className={classNames('animate-pulse bg-slate-200 rounded', className)}
      style={{ width, height }}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText = ({ lines = 1, className }: SkeletonTextProps) => {
  return (
    <div className={classNames('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={classNames(
            'animate-pulse bg-slate-200 rounded h-4',
            index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

interface SkeletonTableRowProps {
  columns: number;
  className?: string;
}

export const SkeletonTableRow = ({
  columns,
  className,
}: SkeletonTableRowProps) => {
  return (
    <tr className={classNames('animate-pulse', className)}>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-3 px-3">
          <div className="bg-slate-200 rounded h-4 w-full" />
        </td>
      ))}
    </tr>
  );
};

interface SkeletonTableProps {
  rows?: number;
  columns: number;
  className?: string;
}

export const SkeletonTable = ({
  rows = 5,
  columns,
  className,
}: SkeletonTableProps) => {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonTableRow key={index} columns={columns} />
      ))}
    </div>
  );
};

interface CardSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showContent?: boolean;
  contentLines?: number;
}

export const CardSkeleton = ({
  className,
  showHeader = true,
  showContent = true,
  contentLines = 3,
}: CardSkeletonProps) => {
  return (
    <div
      className={classNames(
        'bg-white rounded-lg shadow-sm border p-6',
        className
      )}
    >
      {showHeader && (
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      {showContent && (
        <div className="space-y-3">
          {Array.from({ length: contentLines }).map((_, index) => (
            <Skeleton
              key={index}
              className={classNames(
                'h-4',
                index === contentLines - 1 ? 'w-3/4' : 'w-full'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface StatCardSkeletonProps {
  className?: string;
}

export const StatCardSkeleton = ({ className }: StatCardSkeletonProps) => {
  return (
    <div
      className={classNames(
        'bg-white rounded-lg shadow-sm border p-6',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24 mt-1" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
};

interface ButtonSkeletonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ButtonSkeleton = ({
  className,
  size = 'md',
}: ButtonSkeletonProps) => {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return (
    <Skeleton
      className={classNames('rounded-lg', sizeClasses[size], className)}
    />
  );
};

interface FormSkeletonProps {
  fields?: number;
  className?: string;
  showButtons?: boolean;
}

export const FormSkeleton = ({
  fields = 6,
  className,
  showButtons = true,
}: FormSkeletonProps) => {
  return (
    <div className={classNames('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}

      {showButtons && (
        <div className="flex justify-end space-x-3 pt-6">
          <ButtonSkeleton size="md" />
          <ButtonSkeleton size="md" />
        </div>
      )}
    </div>
  );
};

export default Skeleton;
