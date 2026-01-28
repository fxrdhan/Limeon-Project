import React from 'react';

interface ComparisonSkeletonProps {
  className?: string;
  lines?: number;
}

const ComparisonSkeleton: React.FC<ComparisonSkeletonProps> = ({
  className = '',
  lines = 1,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="flex items-center space-x-1">
          {/* Mix of different width skeleton blocks to simulate diff segments */}
          <div className="h-4 bg-slate-200 rounded animate-pulse w-8"></div>
          <div className="h-4 bg-green-200 rounded animate-pulse w-12"></div>
          <div className="h-4 bg-slate-200 rounded animate-pulse w-6"></div>
          <div className="h-4 bg-red-200 rounded animate-pulse w-10"></div>
          <div className="h-4 bg-slate-200 rounded animate-pulse w-16"></div>
          <div className="h-4 bg-green-200 rounded animate-pulse w-8"></div>
          <div className="h-4 bg-slate-200 rounded animate-pulse w-4"></div>
        </div>
      ))}
    </div>
  );
};

export default ComparisonSkeleton;
