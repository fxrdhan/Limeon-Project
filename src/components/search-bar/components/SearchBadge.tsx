import React from 'react';
import { EnhancedSearchState } from '../types';
import { useBadgeBuilder } from '../hooks/useBadgeBuilder';
import Badge from './Badge';

interface SearchBadgeProps {
  searchMode: EnhancedSearchState;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  badgesContainerRef: React.RefObject<HTMLDivElement | null>;
  onClearColumn: () => void;
  onClearOperator: () => void;
  onClearValue: () => void;
  onClearPartialJoin: () => void;
  onClearSecondOperator: () => void;
  onClearSecondValue: () => void;
  onClearAll: () => void;
  onEditColumn: () => void;
  onEditOperator: () => void;
  onEditJoin: () => void;
  onEditValue: () => void;
  onEditSecondValue?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  preservedSearchMode?: EnhancedSearchState | null;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({
  searchMode,
  badgeRef,
  badgesContainerRef,
  onClearColumn,
  onClearOperator,
  onClearValue,
  onClearPartialJoin,
  onClearSecondOperator,
  onClearSecondValue,
  onClearAll,
  onEditColumn,
  onEditOperator,
  onEditJoin,
  onEditValue,
  onEditSecondValue,
  onHoverChange,
  preservedSearchMode,
}) => {
  // Use preserved search mode if available (during edit), otherwise use current
  const modeToRender = preservedSearchMode || searchMode;

  const badges = useBadgeBuilder(modeToRender, {
    onClearColumn,
    onClearOperator,
    onClearValue,
    onClearPartialJoin,
    onClearSecondOperator,
    onClearSecondValue,
    onClearAll,
    onEditColumn,
    onEditOperator,
    onEditJoin,
    onEditValue,
    onEditSecondValue,
  });

  const handleMouseEnter = () => {
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    onHoverChange?.(false);
  };

  // Don't render if no badges
  if (badges.length === 0) {
    return null;
  }

  return (
    <div
      ref={badgesContainerRef}
      className="absolute left-1.5 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-1.5 max-w-[70%] overflow-x-auto scrollbar-hide"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {badges.map((badge, index) => (
        <div key={badge.id} ref={index === 0 ? badgeRef : undefined}>
          <Badge config={badge} />
        </div>
      ))}
    </div>
  );
};

export default SearchBadge;
