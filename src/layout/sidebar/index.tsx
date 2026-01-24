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
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useMemo, useCallback, useEffect, useRef, JSX } from 'react';

interface MenuItem {
  name: string;
  path: string;
  icon: JSX.Element;
  children?: { name: string; path: string }[];
}

interface SidebarProps {
  collapsed: boolean;
  isLocked: boolean;
  toggleLock: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}

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
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    masterData: false,
    inventory: false,
    purchasing: false,
    sales: false,
    clinic: false,
    finance: false,
    reports: false,
    settings: false,
  });

  const [manuallyClosedMenus, setManuallyClosedMenus] = useState<Set<string>>(
    new Set()
  );
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        name: 'Dashboard',
        path: '/',
        icon: <TbHome className="text-lg" />,
      },
      {
        name: 'Master Data',
        path: '/master-data',
        icon: <TbDatabase className="text-lg" />,
        children: [
          { name: 'Item Master', path: '/master-data/item-master' },
          { name: 'Supplier', path: '/master-data/suppliers' },
          { name: 'Pasien', path: '/master-data/patients' },
          { name: 'Dokter', path: '/master-data/doctors' },
        ],
      },
      {
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
        name: 'Penjualan',
        path: '/sales',
        icon: <TbShoppingBag className="text-lg" />,
        children: [
          { name: 'Daftar Penjualan', path: '/sales' },
          { name: 'Tambah Penjualan', path: '/sales/create' },
        ],
      },
      {
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
        name: 'Pengaturan',
        path: '/settings',
        icon: <TbSettings className="text-lg" />,
        children: [
          { name: 'Profil', path: '/settings/profile' },
          { name: 'Pengguna', path: '/settings/users' },
          { name: 'Aplikasi', path: '/settings/app' },
        ],
      },
    ],
    []
  );

  const submenuContainerVariants = {
    open: {
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
    collapsed: {
      transition: { staggerChildren: 0.03, staggerDirection: -1 },
    },
  };

  const submenuItemVariants = {
    open: {
      x: 0,
      opacity: 1,
      transition: {
        x: { stiffness: 1000, velocity: -100 },
      },
    },
    collapsed: {
      x: -10,
      opacity: 0,
      transition: {
        x: { stiffness: 1000 },
      },
    },
  };

  const isActive = useCallback(
    (path: string) => {
      if (path === '/') {
        return location.pathname === '/';
      }
      return (
        location.pathname === path || location.pathname.startsWith(path + '/')
      );
    },
    [location]
  );

  const hasActiveChild = useCallback(
    (children?: { path: string }[]) => {
      if (!children) return false;

      // Check for exact match first
      const exactMatch = children.find(
        child => location.pathname === child.path
      );
      if (exactMatch) return true;

      // Check for sub-routes (especially for item-master)
      const hasMatch = children.some(child => {
        if (child.path === '/master-data/item-master') {
          return location.pathname.startsWith('/master-data/item-master');
        }
        return location.pathname.startsWith(child.path + '/');
      });

      return hasMatch;
    },
    [location.pathname]
  );

  const toggleMenu = useCallback(
    (menu: string) => {
      if (!collapsed) {
        const isCurrentlyOpen = openMenus[menu];
        setOpenMenus(prev => ({ ...prev, [menu]: !isCurrentlyOpen }));
        setManuallyClosedMenus(prevSet => {
          const newSet = new Set(prevSet);
          if (isCurrentlyOpen) {
            newSet.add(menu);
          } else {
            newSet.delete(menu);
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

        setOpenMenus(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => {
            const menuItem = menuItems.find(
              item => item.name.toLowerCase().replace(' ', '') === key
            );
            const isMenuActive =
              menuItem &&
              (isActive(menuItem.path) || hasActiveChild(menuItem.children));
            newState[key] =
              key === menuKey ||
              (Boolean(isMenuActive) && !newManuallyClosed.has(key));
          });
          return newState;
        });
      }
    },
    [collapsed, menuItems, isActive, hasActiveChild, manuallyClosedMenus]
  );

  const handleMenuMouseLeave = useCallback(() => {}, []);

  const handleSubmenuMouseEnter = useCallback(() => {
    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
      menuHoverTimeoutRef.current = null;
    }
  }, []);

  const handleSubmenuMouseLeave = useCallback(() => {}, []);

  const handleMouseEnterSidebar = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
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
        setOpenMenus(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => {
            const menuItem = menuItems.find(
              item => item.name.toLowerCase().replace(' ', '') === key
            );
            const isMenuActive =
              menuItem &&
              (isActive(menuItem.path) || hasActiveChild(menuItem.children));
            newState[key] =
              Boolean(isMenuActive) && !manuallyClosedMenus.has(key);
          });
          return newState;
        });
      }, 200);
    }
  }, [
    collapsed,
    isLocked,
    collapseSidebar,
    menuItems,
    isActive,
    hasActiveChild,
    manuallyClosedMenus,
  ]);

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
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setManuallyClosedMenus(new Set());

      if (!collapsed) {
        setOpenMenus(prev => {
          const newOpenMenus = { ...prev };
          let hasChanges = false;

          menuItems.forEach(item => {
            if (item.children) {
              const menuKey = item.name.toLowerCase().replace(' ', '');
              const shouldBeOpen =
                isActive(item.path) || hasActiveChild(item.children);
              if (newOpenMenus[menuKey] !== shouldBeOpen) {
                newOpenMenus[menuKey] = shouldBeOpen;
                hasChanges = true;
              }
            }
          });

          return hasChanges ? newOpenMenus : prev;
        });
      }
    }, 0);
  }, [location.pathname, collapsed, isActive, hasActiveChild, menuItems]);

  // Get active submenu item for smooth indicator positioning
  const getActiveSubmenuItem = useCallback(
    (children: { name: string; path: string }[]) => {
      return children.find(child => {
        if (child.path === '/master-data/item-master') {
          return location.pathname.startsWith('/master-data/item-master');
        }
        return location.pathname === child.path;
      });
    },
    [location.pathname]
  );

  const activeSubmenuIndex = useCallback(
    (children: { name: string; path: string }[]) => {
      return children.findIndex(child => {
        if (child.path === '/master-data/item-master') {
          return location.pathname.startsWith('/master-data/item-master');
        }
        return location.pathname === child.path;
      });
    },
    [location.pathname]
  );

  return (
    <aside
      onMouseEnter={handleMouseEnterSidebar}
      onMouseLeave={handleMouseLeaveSidebar}
      className={`sidebar bg-white text-gray-800 border-r border-gray-200
                        transition-all duration-500 ease-in-out h-screen
                        ${collapsed ? 'w-20' : 'w-64'} relative group z-10`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 min-w-8 bg-primary rounded-md flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-bold">P</span>
            </div>
            <h2
              className={`ml-2 text-lg font-bold transition-opacity duration-200 ${collapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto'} text-gray-800`}
            >
              PharmaSys
            </h2>
          </div>
          {!collapsed && (
            <motion.button
              onClick={toggleLock}
              className="text-gray-400 hover:text-gray-600 focus:outline-hidden transition-colors duration-150 relative cursor-pointer"
              title={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
              aria-label={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
            >
              <LockToggleIcon isLocked={isLocked} />
            </motion.button>
          )}
        </div>

        <nav className="grow overflow-y-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {menuItems.map(item => (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() =>
                      toggleMenu(item.name.toLowerCase().replace(' ', ''))
                    }
                    onMouseEnter={() =>
                      handleMenuMouseEnter(
                        item.name.toLowerCase().replace(' ', '')
                      )
                    }
                    onMouseLeave={handleMenuMouseLeave}
                    className={`w-full text-left flex items-center pl-2 pr-4 py-6 h-10 justify-between focus-visible:outline-hidden outline-hidden border-0
                                                focus:outline-hidden active:outline-hidden mx-4 rounded-lg
                                                ${
                                                  isActive(item.path) ||
                                                  hasActiveChild(item.children)
                                                    ? collapsed
                                                      ? 'text-primary font-medium'
                                                      : 'bg-primary text-white font-medium'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }
                                                transition-all duration-150 group relative`}
                    style={{
                      outline: 'none',
                      border: 'none',
                      borderLeft: '4px solid transparent',
                    }}
                  >
                    <div className="flex items-center overflow-hidden">
                      <div
                        className={`shrink-0 flex items-center justify-center transition-colors duration-200`}
                      >
                        {item.icon}
                      </div>
                      <span
                        className={`ml-3 truncate transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}
                      >
                        {item.name}
                      </span>
                    </div>
                    {!collapsed && item.children && (
                      <motion.div
                        className="mr-4"
                        animate={{
                          rotate: openMenus[
                            item.name.toLowerCase().replace(' ', '')
                          ]
                            ? 180
                            : 0,
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <TbChevronDown className="text-sm" />
                      </motion.div>
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {!collapsed &&
                      openMenus[item.name.toLowerCase().replace(' ', '')] && (
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
                          onMouseEnter={() => {
                            handleSubmenuMouseEnter();
                            handleMenuMouseEnter(
                              item.name.toLowerCase().replace(' ', '')
                            );
                          }}
                          onMouseLeave={handleSubmenuMouseLeave}
                          className="overflow-hidden"
                        >
                          <motion.div
                            variants={submenuContainerVariants}
                            className="pl-12 pr-2 py-4 relative"
                          >
                            {/* Static background line */}
                            <div className="absolute left-9 top-4 bottom-4 w-0.5 bg-gray-300"></div>

                            {/* Animated active indicator */}
                            <AnimatePresence>
                              {item.children &&
                                getActiveSubmenuItem(item.children) && (
                                  <motion.div
                                    layoutId={`active-submenu-indicator-${item.name}`}
                                    className="absolute left-9 w-0.5 bg-primary z-20"
                                    initial={{
                                      y: activeSubmenuIndex(item.children) * 48,
                                      height: 48,
                                      opacity: 0,
                                      scale: 0.8,
                                    }}
                                    animate={{
                                      y: activeSubmenuIndex(item.children) * 48,
                                      height: 48,
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

                            {item.children &&
                              item.children.map(child => {
                                const isActiveChild =
                                  child.path === '/master-data/item-master'
                                    ? location.pathname.startsWith(
                                        '/master-data/item-master'
                                      )
                                    : location.pathname === child.path;
                                return (
                                  <div
                                    key={child.name}
                                    className="relative"
                                    style={{ height: '48px' }}
                                  >
                                    {/* Active dot indicator */}
                                    <AnimatePresence>
                                      {isActiveChild && (
                                        <motion.div
                                          className="absolute left-[-15px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary z-30"
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
                                          // Prevent navigation if already within the same section
                                          // (e.g., clicking "Item Master" when already at /master-data/item-master/items)
                                          if (
                                            child.path ===
                                              '/master-data/item-master' &&
                                            location.pathname.startsWith(
                                              '/master-data/item-master/'
                                            )
                                          ) {
                                            e.preventDefault();
                                          }
                                        }}
                                        className={`block px-3 py-3 text-sm rounded-md transition-all duration-300 ease-in-out
                                                                focus-visible:outline-hidden outline-hidden
                                                                focus:outline-hidden active:outline-hidden
                                                                transform hover:translate-x-1
                                                                ${
                                                                  isActiveChild
                                                                    ? 'font-medium scale-[1.02] bg-emerald-50'
                                                                    : 'hover:bg-gray-100'
                                                                } whitespace-nowrap overflow-hidden text-ellipsis`}
                                        style={{
                                          outline: 'none',
                                          color: isActiveChild
                                            ? 'oklch(50.8% 0.118 165.612)'
                                            : 'oklch(55.1% 0.027 264.364)',
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
                </>
              ) : (
                <button
                  onClick={() => {
                    if (location.pathname !== item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full text-left flex items-center pl-2 pr-4 py-6 h-10 justify-between focus-visible:outline-hidden outline-hidden border-0
                                                focus:outline-hidden active:outline-hidden mx-4 rounded-lg
                                                ${
                                                  isActive(item.path)
                                                    ? collapsed
                                                      ? 'text-primary font-medium'
                                                      : 'bg-primary text-white font-medium'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }
                                                transition-all duration-150 group relative`}
                  style={{
                    outline: 'none',
                    border: 'none',
                    borderLeft: '4px solid transparent',
                  }}
                >
                  <div className="flex items-center overflow-hidden">
                    <div
                      className={`shrink-0 flex items-center justify-center transition-colors duration-200`}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={`ml-3 truncate transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}
                    >
                      {item.name}
                    </span>
                  </div>
                </button>
              )}
            </div>
          ))}
        </nav>

        <div
          className={`p-4 text-xs text-gray-500 border-t border-gray-200 mt-auto`}
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
                {!collapsed && (
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
