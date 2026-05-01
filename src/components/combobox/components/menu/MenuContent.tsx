import React, { ReactNode } from 'react';
import ScrollIndicators from './ScrollIndicators';

interface MenuContentProps {
  children: ReactNode;
  scrollState: {
    isScrollable: boolean;
    reachedBottom: boolean;
    scrolledFromTop: boolean;
  };
}

const MenuContent: React.FC<MenuContentProps> = ({ children, scrollState }) => {
  return (
    <div className="relative">
      {children}
      <ScrollIndicators
        isScrollable={scrollState.isScrollable}
        scrolledFromTop={scrollState.scrolledFromTop}
        reachedBottom={scrollState.reachedBottom}
      />
    </div>
  );
};

export default MenuContent;
