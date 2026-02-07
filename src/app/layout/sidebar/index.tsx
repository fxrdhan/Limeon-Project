import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  TbBoxMultiple,
  TbChartBar,
  TbChevronDown,
  TbDatabase,
  TbHome,
  TbHospital,
  TbLock,
  TbLockOpen,
  TbSettings,
  TbShoppingBag,
  TbShoppingCart,
} from 'react-icons/tb';

const ITEM_MASTER_PATH = '/master-data/item-master';
const SUBMENU_ITEM_HEIGHT = 48;
const EXPANDED_CONTENT_DELAY_MS = 90;

type SubmenuItem = { name: string; path: string };

interface MenuItem {
  key: string;
  name: string;
  path: string;
  icon: JSX.Element;
  children?: SubmenuItem[];
}

type MenuGroup = MenuItem & { children: SubmenuItem[] };

interface SidebarProps {
  collapsed: boolean;
  isLocked: boolean;
  toggleLock: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    path: '/',
    icon: <TbHome className="text-lg" />,
  },
  {
    key: 'masterData',
    name: 'Master Data',
    path: '/master-data',
    icon: <TbDatabase className="text-lg" />,
    children: [
      { name: 'Item Master', path: ITEM_MASTER_PATH },
      { name: 'Supplier', path: '/master-data/suppliers' },
      { name: 'Pelanggan', path: '/master-data/customers' },
      { name: 'Pasien', path: '/master-data/patients' },
      { name: 'Dokter', path: '/master-data/doctors' },
    ],
  },
  {
    key: 'inventory',
    name: 'Persediaan',
    path: '/inventory',
    icon: <TbBoxMultiple className="text-lg" />,
    children: [
      { name: 'Stok Obat', path: '/inventory/stock' },
      { name: 'Stok Opname', path: '/inventory/stock-opname' },
      { name: 'Obat Kadaluarsa', path: '/inventory/expired' },
    ],
  },
  {
    key: 'purchases',
    name: 'Pembelian',
    path: '/purchases',
    icon: <TbShoppingCart className="text-lg" />,
    children: [
      { name: 'Daftar Pesanan Beli', path: '/purchases/orders' },
      { name: 'Daftar Pembelian', path: '/purchases' },
      { name: 'Riwayat Harga Beli', path: '/purchases/price-history' },
    ],
  },
  {
    key: 'sales',
    name: 'Penjualan',
    path: '/sales',
    icon: <TbShoppingBag className="text-lg" />,
    children: [
      { name: 'Daftar Penjualan', path: '/sales' },
      { name: 'Tambah Penjualan', path: '/sales/create' },
    ],
  },
  {
    key: 'clinic',
    name: 'Klinik',
    path: '/clinic',
    icon: <TbHospital className="text-lg" />,
    children: [
      { name: 'Daftar Pasien', path: '/clinic/patients' },
      { name: 'Antrian', path: '/clinic/queue' },
      { name: 'Rekam Medis', path: '/clinic/medical-records' },
    ],
  },
  {
    key: 'reports',
    name: 'Laporan',
    path: '/reports',
    icon: <TbChartBar className="text-lg" />,
    children: [
      { name: 'Penjualan', path: '/reports/sales' },
      { name: 'Pembelian', path: '/reports/purchases' },
      { name: 'Stok', path: '/reports/stock' },
    ],
  },
  {
    key: 'settings',
    name: 'Pengaturan',
    path: '/settings',
    icon: <TbSettings className="text-lg" />,
    children: [
      { name: 'Profil', path: '/settings/profile' },
      { name: 'Pengguna', path: '/settings/users' },
      { name: 'Aplikasi', path: '/settings/app' },
    ],
  },
];

const MENU_GROUPS: MenuGroup[] = MENU_ITEMS.filter((item): item is MenuGroup =>
  Boolean(item.children)
);

const menuButtonStyle = {
  outline: 'none',
  border: 'none',
  borderLeft: '4px solid transparent',
} as const;

const submenuLinkColors = {
  active: 'oklch(50.8% 0.118 165.612)',
  inactive: 'oklch(55.1% 0.027 264.364)',
} as const;

const submenuContainerVariants = {
  open: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
  collapsed: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
} as const;

const submenuItemVariants = {
  open: {
    opacity: 1,
    transition: {
      opacity: { duration: 0.2 },
    },
  },
  collapsed: {
    opacity: 0,
    transition: {
      opacity: { duration: 0.15 },
    },
  },
} as const;

const getMenuButtonClassName = ({
  collapsed,
  isActive,
}: {
  collapsed: boolean;
  isActive: boolean;
}) => {
  return `w-full text-left flex items-center pl-2 pr-4 py-6 h-10 justify-between focus-visible:outline-hidden outline-hidden border-0 cursor-pointer focus:outline-hidden active:outline-hidden rounded-lg ${
    isActive
      ? collapsed
        ? 'text-primary font-medium'
        : 'bg-primary text-white font-medium'
      : 'text-slate-600 hover:bg-slate-100'
  } transition-all duration-150 group relative`;
};

const isRouteActive = (pathname: string, path: string) => {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(path + '/');
};

const hasActiveChildRoute = (pathname: string, children?: SubmenuItem[]) => {
  if (!children) return false;

  const exactMatch = children.some(child => pathname === child.path);
  if (exactMatch) return true;

  return children.some(child => {
    if (child.path === ITEM_MASTER_PATH) {
      return pathname.startsWith(ITEM_MASTER_PATH);
    }
    return pathname.startsWith(child.path + '/');
  });
};

const buildOpenMenusState = ({
  forceOpenMenuKey,
  manuallyClosedMenus,
  pathname,
}: {
  forceOpenMenuKey?: string;
  manuallyClosedMenus: Set<string>;
  pathname: string;
}) => {
  return Object.fromEntries(
    MENU_GROUPS.map(item => {
      const isMenuActive =
        isRouteActive(pathname, item.path) ||
        hasActiveChildRoute(pathname, item.children);
      return [
        item.key,
        item.key === forceOpenMenuKey ||
          (Boolean(isMenuActive) && !manuallyClosedMenus.has(item.key)),
      ] as const;
    })
  ) as Record<string, boolean>;
};

const isSubmenuItemActive = (pathname: string, childPath: string) => {
  if (childPath === ITEM_MASTER_PATH) {
    return pathname.startsWith(ITEM_MASTER_PATH);
  }
  return pathname === childPath;
};

const getActiveSubmenuIndex = (pathname: string, children: SubmenuItem[]) =>
  children.findIndex(child => isSubmenuItemActive(pathname, child.path));

const SidebarMenuLabel = ({
  collapsed,
  icon,
  isActive,
  name,
}: {
  collapsed: boolean;
  icon: JSX.Element;
  isActive: boolean;
  name: string;
}) => (
  <div className="flex items-center overflow-hidden">
    <div
      className={`shrink-0 flex items-center justify-center transition-colors duration-200 ${
        isActive && !collapsed ? 'text-white' : ''
      }`}
    >
      {icon}
    </div>
    <span
      className={`ml-3 truncate transition-all duration-300 ease-in-out ${
        collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'
      } ${isActive && !collapsed ? 'text-white' : ''}`}
    >
      {name}
    </span>
  </div>
);

const LockToggleIcon = ({ isLocked }: { isLocked: boolean }) => (
  <div className="transition-all duration-200">
    {isLocked ? <TbLock /> : <TbLockOpen />}
  </div>
);

const Sidebar = ({
  collapsed,
  isLocked,
  toggleLock,
  expandSidebar,
  collapseSidebar,
}: SidebarProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        MENU_GROUPS.map(item => [item.key, false] as const)
      ) as Record<string, boolean>
  );

  const [manuallyClosedMenus, setManuallyClosedMenus] = useState<Set<string>>(
    () => new Set()
  );
  const [isExpandedContentReady, setIsExpandedContentReady] =
    useState(!collapsed);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showExpandedContent = !collapsed && isExpandedContentReady;
  const isVisuallyCollapsed = collapsed || !isExpandedContentReady;

  const toggleMenu = useCallback(
    (menuKey: string) => {
      if (!collapsed) {
        const isCurrentlyOpen = Boolean(openMenus[menuKey]);
        setOpenMenus(prev => ({ ...prev, [menuKey]: !isCurrentlyOpen }));
        setManuallyClosedMenus(prevSet => {
          const newSet = new Set(prevSet);
          if (isCurrentlyOpen) {
            newSet.add(menuKey);
          } else {
            newSet.delete(menuKey);
          }
          return newSet;
        });
      }
    },
    [collapsed, openMenus]
  );

  const handleMenuMouseEnter = useCallback(
    (menuKey: string) => {
      if (!collapsed) {
        if (menuHoverTimeoutRef.current) {
          clearTimeout(menuHoverTimeoutRef.current);
          menuHoverTimeoutRef.current = null;
        }

        const newManuallyClosed = new Set(manuallyClosedMenus);
        newManuallyClosed.delete(menuKey);
        setManuallyClosedMenus(newManuallyClosed);

        setOpenMenus(() =>
          buildOpenMenusState({
            forceOpenMenuKey: menuKey,
            manuallyClosedMenus: newManuallyClosed,
            pathname,
          })
        );
      }
    },
    [collapsed, manuallyClosedMenus, pathname]
  );

  const handleMouseEnterSidebar = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
      menuHoverTimeoutRef.current = null;
    }
    if (!isLocked && collapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        expandSidebar();
      }, 100);
    }
  }, [collapsed, isLocked, expandSidebar]);

  const handleMouseLeaveSidebar = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!isLocked && !collapsed) {
      collapseSidebar();
    }
    if (!collapsed) {
      menuHoverTimeoutRef.current = setTimeout(() => {
        setOpenMenus(() =>
          buildOpenMenusState({
            manuallyClosedMenus,
            pathname,
          })
        );
      }, 200);
    }
  }, [collapsed, isLocked, collapseSidebar, pathname, manuallyClosedMenus]);

  useEffect(() => {
    if (collapsed) {
      const timeoutId = setTimeout(() => {
        setIsExpandedContentReady(false);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
      };
    }

    const timeoutId = setTimeout(() => {
      setIsExpandedContentReady(true);
    }, EXPANDED_CONTENT_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [collapsed]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setManuallyClosedMenus(new Set());

      if (!collapsed) {
        setOpenMenus(prev => {
          const next = { ...prev };
          let hasChanges = false;

          MENU_GROUPS.forEach(item => {
            const shouldBeOpen =
              isRouteActive(pathname, item.path) ||
              hasActiveChildRoute(pathname, item.children);
            if (next[item.key] !== shouldBeOpen) {
              next[item.key] = shouldBeOpen;
              hasChanges = true;
            }
          });

          return hasChanges ? next : prev;
        });
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [collapsed, pathname]);

  return (
    <aside
      onMouseEnter={handleMouseEnterSidebar}
      onMouseLeave={handleMouseLeaveSidebar}
      className={`sidebar bg-white text-slate-800 border-r border-slate-200
                        transition-all duration-500 ease-in-out h-screen
                        ${collapsed ? 'w-20' : 'w-64'} relative group z-10 overflow-x-hidden`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 min-w-8 bg-primary rounded-md flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-bold">P</span>
            </div>
            <h2
              className={`ml-2 text-lg font-bold transition-opacity duration-200 ${isVisuallyCollapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto'} text-slate-800`}
            >
              PharmaSys
            </h2>
          </div>
          {showExpandedContent && (
            <motion.button
              onClick={toggleLock}
              className="text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors duration-150 relative cursor-pointer"
              title={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
              aria-label={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
            >
              <LockToggleIcon isLocked={isLocked} />
            </motion.button>
          )}
        </div>

        <nav className="grow overflow-y-auto py-4 px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {MENU_ITEMS.map(item => {
            const menuKey = item.key;
            const isMenuActive =
              isRouteActive(pathname, item.path) ||
              hasActiveChildRoute(pathname, item.children);
            const menuButtonClassName = getMenuButtonClassName({
              collapsed: isVisuallyCollapsed,
              isActive: isMenuActive,
            });

            if (item.children) {
              const children = item.children;
              const activeChildIndex = getActiveSubmenuIndex(
                pathname,
                children
              );

              return (
                <div key={item.key}>
                  <button
                    onClick={() => toggleMenu(menuKey)}
                    onMouseEnter={() => handleMenuMouseEnter(menuKey)}
                    className={menuButtonClassName}
                    style={menuButtonStyle}
                  >
                    <SidebarMenuLabel
                      collapsed={isVisuallyCollapsed}
                      icon={item.icon}
                      isActive={isMenuActive}
                      name={item.name}
                    />
                    {showExpandedContent && (
                      <motion.div
                        animate={{
                          rotate: openMenus[menuKey] ? 180 : 0,
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <TbChevronDown
                          className={`text-sm ${
                            isMenuActive ? 'text-white' : ''
                          }`}
                        />
                      </motion.div>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {showExpandedContent && openMenus[menuKey] && (
                      <motion.div
                        key="submenu-content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                          open: { opacity: 1, height: 'auto' },
                          collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{
                          duration: 0.4,
                          ease: 'easeInOut',
                        }}
                        onMouseEnter={() => handleMenuMouseEnter(menuKey)}
                        className="overflow-hidden"
                      >
                        <motion.div
                          variants={submenuContainerVariants}
                          className="pl-5 pr-4 py-2 relative"
                        >
                          {/* Static background line */}
                          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-slate-300"></div>

                          {/* Animated active indicator */}
                          <AnimatePresence>
                            {activeChildIndex !== -1 && (
                              <motion.div
                                layoutId={`active-submenu-indicator-${item.key}`}
                                className="absolute w-0.5 bg-primary z-20"
                                initial={{
                                  y: activeChildIndex * SUBMENU_ITEM_HEIGHT,
                                  height: SUBMENU_ITEM_HEIGHT,
                                  opacity: 0,
                                  scale: 0.8,
                                }}
                                animate={{
                                  y: activeChildIndex * SUBMENU_ITEM_HEIGHT,
                                  height: SUBMENU_ITEM_HEIGHT,
                                  opacity: 1,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.8,
                                  transition: { duration: 0.2 },
                                }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 300,
                                  damping: 30,
                                  mass: 0.8,
                                }}
                              />
                            )}
                          </AnimatePresence>

                          {children.map(child => {
                            const isActiveChild = isSubmenuItemActive(
                              pathname,
                              child.path
                            );

                            return (
                              <div
                                key={child.path}
                                className="relative"
                                style={{ height: SUBMENU_ITEM_HEIGHT }}
                              >
                                {/* Active dot indicator */}
                                <AnimatePresence>
                                  {isActiveChild && (
                                    <motion.div
                                      className="absolute left-[-3px] top-5 h-2 w-2 -translate-y-0.5 rounded-full bg-primary z-30"
                                      initial={{
                                        scale: 0,
                                        opacity: 0,
                                      }}
                                      animate={{
                                        scale: 1,
                                        opacity: 1,
                                      }}
                                      exit={{
                                        scale: 0,
                                        opacity: 0,
                                      }}
                                      transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 25,
                                        delay: 0.1,
                                      }}
                                    />
                                  )}
                                </AnimatePresence>

                                <motion.div variants={submenuItemVariants}>
                                  <Link
                                    to={child.path}
                                    onClick={e => {
                                      if (
                                        child.path === ITEM_MASTER_PATH &&
                                        pathname.startsWith(
                                          ITEM_MASTER_PATH + '/'
                                        )
                                      ) {
                                        e.preventDefault();
                                      }
                                    }}
                                    className={`block px-6 py-3 text-sm rounded-md transition-all duration-300 ease-in-out
                                                                focus-visible:outline-hidden outline-hidden
                                                                focus:outline-hidden active:outline-hidden
                                                                ${
                                                                  isActiveChild
                                                                    ? 'font-medium'
                                                                    : ''
                                                                } whitespace-nowrap overflow-hidden text-ellipsis`}
                                    style={{
                                      outline: 'none',
                                      color: isActiveChild
                                        ? submenuLinkColors.active
                                        : submenuLinkColors.inactive,
                                    }}
                                  >
                                    {child.name}
                                  </Link>
                                </motion.div>
                              </div>
                            );
                          })}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (pathname !== item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={menuButtonClassName}
                  style={menuButtonStyle}
                >
                  <SidebarMenuLabel
                    collapsed={isVisuallyCollapsed}
                    icon={item.icon}
                    isActive={isMenuActive}
                    name={item.name}
                  />
                </button>
              </div>
            );
          })}
        </nav>

        <div
          className={`p-4 text-xs text-slate-500 border-t border-slate-200 mt-auto`}
        >
          <div className="h-4">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <AnimatePresence initial={false}>
                {showExpandedContent && (
                  <motion.div
                    key="pharmasys-text"
                    initial={{ opacity: 0, width: 0, marginRight: 0 }}
                    animate={{
                      opacity: 1,
                      width: 'auto',
                      marginRight: '0.25em',
                    }}
                    exit={{ opacity: 0, width: 0, marginRight: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
                  >
                    PharmaSys
                  </motion.div>
                )}
              </AnimatePresence>
              <span>v2.3.0</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
