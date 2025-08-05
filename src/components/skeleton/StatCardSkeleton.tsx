import React from 'react';
import { Card } from '@/components/card';
import Skeleton from './Skeleton';

interface StatCardSkeletonProps {
  className?: string;
  animate?: boolean;
}

const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({
  className = '',
  animate = true,
}) => {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center">
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-2" animate={animate} />
          <Skeleton className="h-8 w-16" animate={animate} />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" animate={animate} />
      </div>
    </Card>
  );
};

export default StatCardSkeleton;
