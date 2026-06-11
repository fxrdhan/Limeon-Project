import type { RefObject } from 'react';
import PageTitle from '@/components/page-title';
import { SlidingSelector } from '@/components/shared/sliding-selector';
import type { MasterDataType } from '@/features/item-management/shared/types';
import { ITEM_MASTER_SWITCHER_TAB_OPTIONS } from '../config';

interface ItemMasterHeaderProps {
  activeTab: MasterDataType;
  pageTitle: string;
  showTabSelector: boolean;
  tabSelectorContainerRef: RefObject<HTMLDivElement | null>;
  tabSelectorLayerClass: string;
  tabSelectorCollapseSignal: number;
  onTabChange: (key: string, value: MasterDataType) => void;
  onTabSelectorExpandedChange: (expanded: boolean) => void;
}

export function ItemMasterHeader({
  activeTab,
  pageTitle,
  showTabSelector,
  tabSelectorContainerRef,
  tabSelectorLayerClass,
  tabSelectorCollapseSignal,
  onTabChange,
  onTabSelectorExpandedChange,
}: ItemMasterHeaderProps) {
  return (
    <div className="relative flex items-center justify-center mb-0 pt-0">
      <div ref={tabSelectorContainerRef} className="absolute left-0 pb-4 pt-6">
        {showTabSelector && (
          <SlidingSelector
            options={ITEM_MASTER_SWITCHER_TAB_OPTIONS}
            activeKey={activeTab}
            onSelectionChange={onTabChange}
            variant="tabs"
            size="md"
            shape="rounded"
            className={`${tabSelectorLayerClass} [&_[role=tab]]:rounded-lg [&_[role=tab]>.absolute]:rounded-lg`}
            collapsible={true}
            defaultExpanded={false}
            expandOnHover={true}
            expandDirection="vertical"
            onExpandedChange={onTabSelectorExpandedChange}
            collapseSignal={tabSelectorCollapseSignal}
            autoCollapseDelay={150}
            layoutId="item-master-tabs"
            animationPreset="smooth"
          />
        )}
      </div>

      <PageTitle title={pageTitle} />
    </div>
  );
}
