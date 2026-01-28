import React from 'react';
import classNames from 'classnames';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = true,
  animate = true,
}) => {
  const style: React.CSSProperties = {};

  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }

  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <div
      className={classNames(
        'bg-slate-200',
        {
          rounded: rounded,
          'animate-pulse': animate,
        },
        className
      )}
      style={style}
    />
  );
};

export default Skeleton;
