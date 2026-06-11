import type { IconType } from 'react-icons';
import { MENU_ICON_CLASS_NAME } from './constants';

interface SidebarMenuLabelProps {
  collapsed: boolean;
  icon: IconType;
  name: string;
}

const SidebarMenuLabel = ({
  collapsed,
  icon: Icon,
  name,
}: SidebarMenuLabelProps) => (
  <div className="relative z-10 flex items-center overflow-hidden">
    <div className="flex shrink-0 items-center justify-center transition-colors duration-200">
      <Icon className={MENU_ICON_CLASS_NAME} />
    </div>
    <span
      className={`ml-3 truncate transition-all duration-300 ease-in-out ${
        collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
      }`}
    >
      {name}
    </span>
  </div>
);

export default SidebarMenuLabel;
