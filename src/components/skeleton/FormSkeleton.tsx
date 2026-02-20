import React from 'react';
import { Card } from '@/components/card';
import Skeleton from './Skeleton';
import ButtonSkeleton from './ButtonSkeleton';

interface FormSkeletonProps {
  fields?: number;
  showTitle?: boolean;
  showButtons?: boolean;
  className?: string;
  animate?: boolean;
}

const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 6,
  showTitle = true,
  showButtons = true,
  className = '',
  animate = true,
}) => {
  return (
    <Card className={`p-6 ${className}`}>
      {showTitle && (
        <div className="mb-6">
          <Skeleton className="h-8 w-48" animate={animate} />
        </div>
      )}

      <div className="space-y-6">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" animate={animate} />
            <Skeleton className="h-10 w-full rounded-lg" animate={animate} />
          </div>
        ))}

        {showButtons && (
          <div className="flex justify-end space-x-3 pt-6">
            <ButtonSkeleton width="80px" animate={animate} />
            <ButtonSkeleton width="100px" animate={animate} />
          </div>
        )}
      </div>
    </Card>
  );
};

export default FormSkeleton;
