import type { ComponentProps } from 'react';
import SearchToolbar from '@/components/SearchToolbar';

type SearchToolbarProps = ComponentProps<typeof SearchToolbar>;

const ItemMasterSearchToolbarSection = (props: SearchToolbarProps) => (
  <div className="flex items-center pt-8">
    <div className="grow">
      <SearchToolbar {...props} />
    </div>
  </div>
);

export default ItemMasterSearchToolbarSection;
