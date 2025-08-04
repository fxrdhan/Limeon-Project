import React from 'react';
import { Card } from '@/components/card';
import Skeleton from './Skeleton';
import SkeletonText from './SkeletonText';

interface CardSkeletonProps {
  showHeader?: boolean;
  showBody?: boolean;
  bodyLines?: number;
  className?: string;
  animate?: boolean;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showHeader = true,
  showBody = true,
  bodyLines = 3,
  className = '',
  animate = true,
}) => {
  return (
    <Card className={`p-6 ${className}`}>
      {showHeader && (
        <div className="mb-4">
          <Skeleton className="h-6 w-48" animate={animate} />
        </div>
      )}
      
      {showBody && (
        <div className="space-y-3">
          <SkeletonText lines={bodyLines} animate={animate} />
        </div>
      )}
    </Card>
  );
};

export default CardSkeleton;