import { memo } from 'react';
import ItemMasterGridSection from './components/ItemMasterGridSection';
import { ItemMasterHeader } from './components/ItemMasterHeader';
import { ItemMasterModalStack } from './components/ItemMasterModalStack';
import ItemMasterSearchToolbarSection from './components/ItemMasterSearchToolbarSection';
import { useItemMasterPage } from './useItemMasterPage';

const ItemMasterNew = memo(() => {
  const page = useItemMasterPage();

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-6">
        <ItemMasterHeader {...page.headerProps} />

        <ItemMasterSearchToolbarSection {...page.searchToolbarProps} />

        <ItemMasterGridSection {...page.gridSectionProps} />
      </div>

      <ItemMasterModalStack {...page.modalStackProps} />
    </>
  );
});

ItemMasterNew.displayName = 'ItemMasterNew';

export default ItemMasterNew;
