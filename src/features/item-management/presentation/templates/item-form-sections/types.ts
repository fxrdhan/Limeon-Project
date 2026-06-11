import type React from 'react';

export interface CollapsibleSectionProps {
  isExpanded: boolean;
  onExpand: () => void;
  stackClassName?: string;
  stackStyle?: React.CSSProperties;
  itemId?: string;
  onRequestNextSection?: () => void;
}

export interface PricingSectionProps extends CollapsibleSectionProps {
  onLevelPricingToggle?: (isOpen: boolean) => void;
}

export interface OptionalSectionProps extends CollapsibleSectionProps {
  itemId?: string;
}

export interface BasicInfoRequiredProps {
  itemId?: string;
}
