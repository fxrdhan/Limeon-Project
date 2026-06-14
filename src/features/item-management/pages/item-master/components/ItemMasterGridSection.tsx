import EntityGrid from '@/features/item-management/presentation/organisms/EntityGrid';
import type { EntityGridProps } from '@/features/item-management/presentation/organisms/entity-grid/types';

const ItemMasterGridSection = (props: EntityGridProps) => (
  <div className="min-h-0 flex-1">
    <EntityGrid {...props} />
  </div>
);

export default ItemMasterGridSection;
