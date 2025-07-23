import React from 'react';

interface ScrollIndicatorsProps {
  isScrollable: boolean;
  scrolledFromTop: boolean;
  reachedBottom: boolean;
}

const ScrollIndicators: React.FC<ScrollIndicatorsProps> = ({
  isScrollable,
  scrolledFromTop,
  reachedBottom,
}) => {
  if (!isScrollable) return null;

  return (
    <>
      {scrolledFromTop && (
        <div className="absolute top-0 left-0 w-full h-8 pointer-events-none" />
      )}
      {!reachedBottom && (
        <div className="absolute bottom-0 left-0 w-full h-8 pointer-events-none" />
      )}
    </>
  );
};

export default ScrollIndicators;