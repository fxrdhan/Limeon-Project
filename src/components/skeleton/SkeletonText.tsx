import React from 'react';
import Skeleton from './Skeleton';

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  animate?: boolean;
}

const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  className = '',
  animate = true,
}) => {
  if (lines === 1) {
    return <Skeleton className={`h-4 ${className}`} animate={animate} />;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
          animate={animate}
        />
      ))}
    </div>
  );
};

export default SkeletonText;
