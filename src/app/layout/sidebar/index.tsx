import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  TbBox,
  TbBuildingHospital,
  TbChartBar,
  TbChevronDown,
  TbDatabase,
  TbHome,
  TbLock,
  TbLockOpen,
  TbSettings,
  TbShoppingBag,
  TbShoppingCart,
} from 'react-icons/tb';

const ITEM_MASTER_PATH = '/master-data/item-master';
const BRAND_NAME = 'PharmaSys';
const SUBMENU_ITEM_HEIGHT = 48;
const EXPANDED_CONTENT_DELAY_MS = 90;
const HOVER_HIGHLIGHT_CLEAR_DELAY_MS = 80;

type SubmenuItem = { name: string; path: string };

type SidebarHoverTarget =
  | { type: 'menu'; menuKey: string }
  | { type: 'submenu'; menuKey: string; index: number };

type SidebarHighlightFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  isVisible: boolean;
  shouldAnimate: boolean;
};

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

const menuIconClassName = 'h-[18px] w-[18px]';

const HomeIcon = () => <TbHome className={menuIconClassName} />;

const DatabaseIcon = () => <TbDatabase className={menuIconClassName} />;

const BoxIcon = () => <TbBox className={menuIconClassName} />;

const ShoppingCartIcon = () => <TbShoppingCart className={menuIconClassName} />;

const ShoppingBagIcon = () => <TbShoppingBag className={menuIconClassName} />;

const HospitalIcon = () => <TbBuildingHospital className={menuIconClassName} />;

const ChartBarIcon = () => <TbChartBar className={menuIconClassName} />;

const SettingsIcon = () => <TbSettings className={menuIconClassName} />;

const ChevronDownIcon = () => <TbChevronDown className={menuIconClassName} />;

const LockIcon = () => <TbLock className={menuIconClassName} />;

const UnlockIcon = () => <TbLockOpen className={menuIconClassName} />;

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    path: '/',
    icon: <HomeIcon />,
  },
  {
    key: 'masterData',
    name: 'Master Data',
    path: '/master-data',
    icon: <DatabaseIcon />,
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
    icon: <BoxIcon />,
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
    icon: <ShoppingCartIcon />,
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
    icon: <ShoppingBagIcon />,
    children: [
      { name: 'Daftar Penjualan', path: '/sales' },
      { name: 'Tambah Penjualan', path: '/sales/create' },
    ],
  },
  {
    key: 'clinic',
    name: 'Klinik',
    path: '/clinic',
    icon: <HospitalIcon />,
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
    icon: <ChartBarIcon />,
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
    icon: <SettingsIcon />,
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

const brandTitleVariants = {
  hidden: {
    opacity: 1,
    transition: {
      staggerChildren: 0.018,
      staggerDirection: -1,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.026,
      delayChildren: 0.02,
    },
  },
} as const;

const brandTitleCharacterVariants = {
  hidden: {
    opacity: 0,
    x: -3,
  },
  visible: {
    opacity: 1,
    x: 0,
  },
} as const;

const sidebarBackgroundTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} as const;

const getSidebarTargetId = (target: SidebarHoverTarget) =>
  target.type === 'menu'
    ? `menu:${target.menuKey}`
    : `submenu:${target.menuKey}:${target.index}`;

const getMenuButtonClassName = ({
  isActive,
  isHighlighted,
}: {
  isActive: boolean;
  isHighlighted: boolean;
}) =>
  `relative flex h-10 w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl py-6 pl-2 pr-4 text-left transition-all duration-150 group focus-visible:outline-hidden outline-hidden border-0 focus:outline-hidden active:outline-hidden ${
    isActive || isHighlighted
      ? 'font-medium text-primary'
      : 'text-slate-600 hover:text-primary'
  }`;

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
  name,
}: {
  collapsed: boolean;
  icon: JSX.Element;
  name: string;
}) => (
  <div className="relative z-10 flex items-center overflow-hidden">
    <div className="flex shrink-0 items-center justify-center transition-colors duration-200">
      {icon}
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

const LockToggleIcon = ({ isLocked }: { isLocked: boolean }) => (
  <div className="transition-all duration-200">
    {isLocked ? <LockIcon /> : <UnlockIcon />}
  </div>
);

const BrandTitle = () => (
  <motion.h2
    className="ml-4 flex overflow-hidden whitespace-nowrap text-lg font-bold text-slate-800"
    initial="hidden"
    animate="visible"
    exit="hidden"
    variants={brandTitleVariants}
  >
    {BRAND_NAME.split('').map((character, index) => (
      <motion.span
        key={`${character}-${index}`}
        className="inline-block"
        variants={brandTitleCharacterVariants}
        transition={{ duration: 0.08, ease: 'easeOut' }}
      >
        {character}
      </motion.span>
    ))}
  </motion.h2>
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
  const [hoveredSidebarItem, setHoveredSidebarItem] =
    useState<SidebarHoverTarget | null>(null);
  const [highlightFrame, setHighlightFrame] = useState<SidebarHighlightFrame>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    isVisible: false,
    shouldAnimate: false,
  });
  const [isExpandedContentReady, setIsExpandedContentReady] =
    useState(!collapsed);
  const navRef = useRef<HTMLElement | null>(null);
  const sidebarItemRefs = useRef(new Map<string, HTMLElement>());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showExpandedContent = !collapsed && isExpandedContentReady;
  const isVisuallyCollapsed = collapsed || !isExpandedContentReady;
  const highlightedSidebarItem = hoveredSidebarItem;
  const highlightedSidebarItemId = highlightedSidebarItem
    ? getSidebarTargetId(highlightedSidebarItem)
    : null;

  const setSidebarItemRef = useCallback(
    (target: SidebarHoverTarget, element: HTMLElement | null) => {
      const targetId = getSidebarTargetId(target);

      if (element) {
        sidebarItemRefs.current.set(targetId, element);
        return;
      }

      sidebarItemRefs.current.delete(targetId);
    },
    []
  );

  const clearHighlightClearTimeout = useCallback(() => {
    if (highlightClearTimeoutRef.current) {
      clearTimeout(highlightClearTimeoutRef.current);
      highlightClearTimeoutRef.current = null;
    }
  }, []);

  const setHoveredSidebarTarget = useCallback(
    (target: SidebarHoverTarget) => {
      clearHighlightClearTimeout();
      setHoveredSidebarItem(target);
    },
    [clearHighlightClearTimeout]
  );

  const scheduleHoveredSidebarClear = useCallback(
    (menuKey?: string) => {
      clearHighlightClearTimeout();

      highlightClearTimeoutRef.current = setTimeout(() => {
        setHoveredSidebarItem(currentItem => {
          if (menuKey && currentItem?.menuKey !== menuKey) {
            return currentItem;
          }

          return null;
        });
        highlightClearTimeoutRef.current = null;
      }, HOVER_HIGHLIGHT_CLEAR_DELAY_MS);
    },
    [clearHighlightClearTimeout]
  );

  const toggleMenu = useCallback(
    (menuKey: string) => {
      if (collapsed) {
        return;
      }

      const isCurrentlyOpen = Boolean(openMenus[menuKey]);
      setOpenMenus(prev => ({ ...prev, [menuKey]: !isCurrentlyOpen }));
      setManuallyClosedMenus(prevSet => {
        const next = new Set(prevSet);
        if (isCurrentlyOpen) {
          next.add(menuKey);
        } else {
          next.delete(menuKey);
        }
        return next;
      });
    },
    [collapsed, openMenus]
  );

  const handleMenuMouseEnter = useCallback(
    (menuKey: string) => {
      if (collapsed) {
        return;
      }

      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
        menuHoverTimeoutRef.current = null;
      }

      const nextManuallyClosed = new Set(manuallyClosedMenus);
      nextManuallyClosed.delete(menuKey);
      setManuallyClosedMenus(nextManuallyClosed);

      setOpenMenus(
        buildOpenMenusState({
          forceOpenMenuKey: menuKey,
          manuallyClosedMenus: nextManuallyClosed,
          pathname,
        })
      );
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

    clearHighlightClearTimeout();

    if (!isLocked && collapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        expandSidebar();
      }, 100);
    }
  }, [clearHighlightClearTimeout, collapsed, expandSidebar, isLocked]);

  const handleMouseLeaveSidebar = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (!isLocked && !collapsed) {
      collapseSidebar();
    }

    clearHighlightClearTimeout();
    setHoveredSidebarItem(null);

    if (!collapsed) {
      menuHoverTimeoutRef.current = setTimeout(() => {
        setOpenMenus(
          buildOpenMenusState({
            manuallyClosedMenus,
            pathname,
          })
        );
      }, 200);
    }
  }, [
    clearHighlightClearTimeout,
    collapseSidebar,
    collapsed,
    isLocked,
    manuallyClosedMenus,
    pathname,
  ]);

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

  useEffect(
    () => () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
      }
      if (highlightClearTimeoutRef.current) {
        clearTimeout(highlightClearTimeoutRef.current);
      }
    },
    []
  );

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

  useLayoutEffect(() => {
    const navElement = navRef.current;

    if (!navElement || !highlightedSidebarItemId) {
      setHighlightFrame(currentFrame =>
        currentFrame.isVisible
          ? { ...currentFrame, isVisible: false }
          : currentFrame
      );
      return;
    }

    const targetElement = sidebarItemRefs.current.get(highlightedSidebarItemId);

    if (!targetElement) {
      setHighlightFrame(currentFrame =>
        currentFrame.isVisible
          ? { ...currentFrame, isVisible: false }
          : currentFrame
      );
      return;
    }

    const updateHighlightFrame = () => {
      const navRect = navElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      setHighlightFrame(currentFrame => ({
        left: targetRect.left - navRect.left + navElement.scrollLeft,
        top: targetRect.top - navRect.top + navElement.scrollTop,
        width: targetRect.width,
        height: targetRect.height,
        isVisible: true,
        shouldAnimate: currentFrame.isVisible,
      }));
    };

    updateHighlightFrame();
    const animationFrameId = requestAnimationFrame(updateHighlightFrame);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateHighlightFrame);

    resizeObserver?.observe(navElement);
    resizeObserver?.observe(targetElement);
    window.addEventListener('resize', updateHighlightFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateHighlightFrame);
    };
  }, [highlightedSidebarItemId, openMenus, showExpandedContent]);

  return (
    <aside
      onMouseEnter={handleMouseEnterSidebar}
      onMouseLeave={handleMouseLeaveSidebar}
      className={`sidebar relative z-10 h-screen overflow-x-hidden border-r border-slate-200 bg-white text-slate-800 transition-all duration-500 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center">
            <div className="flex h-10 w-10 min-w-8 shrink-0 items-center justify-center rounded-xl bg-primary">
              <span className="text-xl font-bold text-white">P</span>
            </div>
            <AnimatePresence initial={false}>
              {isVisuallyCollapsed ? null : <BrandTitle />}
            </AnimatePresence>
          </div>

          {showExpandedContent ? (
            <button
              type="button"
              onClick={toggleLock}
              className="relative cursor-pointer text-slate-400 transition-colors duration-150 hover:text-slate-600 focus:outline-hidden"
              title={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
              aria-label={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
            >
              <LockToggleIcon isLocked={isLocked} />
            </button>
          ) : null}
        </div>

        <nav
          ref={navRef}
          className="relative grow overflow-y-auto px-4 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <motion.div
            aria-hidden="true"
            className={`pointer-events-none absolute left-0 top-0 z-0 bg-primary-light ${
              highlightedSidebarItem?.type === 'submenu'
                ? 'rounded-r-xl'
                : 'rounded-xl'
            }`}
            initial={false}
            animate={{
              opacity: highlightFrame.isVisible ? 1 : 0,
              x: highlightFrame.left,
              y: highlightFrame.top,
              width: highlightFrame.width,
              height: highlightFrame.height,
            }}
            transition={
              highlightFrame.shouldAnimate
                ? sidebarBackgroundTransition
                : { duration: 0 }
            }
          />
          {MENU_ITEMS.map(item => {
            const menuKey = item.key;
            const isMenuActive =
              isRouteActive(pathname, item.path) ||
              hasActiveChildRoute(pathname, item.children);

            if (item.children) {
              const children = item.children;
              const activeChildIndex = getActiveSubmenuIndex(
                pathname,
                children
              );
              const isHoveredMenu =
                hoveredSidebarItem?.type === 'menu' &&
                hoveredSidebarItem.menuKey === item.key;
              const isHighlightedMenu =
                isHoveredMenu ||
                (!hoveredSidebarItem &&
                  isMenuActive &&
                  activeChildIndex === -1);
              const menuButtonClassName = getMenuButtonClassName({
                isActive: isMenuActive,
                isHighlighted: isHighlightedMenu,
              });

              return (
                <div
                  key={item.key}
                  className="relative z-10"
                  onMouseLeave={() => {
                    scheduleHoveredSidebarClear(menuKey);
                  }}
                >
                  <button
                    ref={element => {
                      setSidebarItemRef({ type: 'menu', menuKey }, element);
                    }}
                    type="button"
                    onClick={() => toggleMenu(menuKey)}
                    onMouseEnter={() => {
                      setHoveredSidebarTarget({ type: 'menu', menuKey });
                      handleMenuMouseEnter(menuKey);
                    }}
                    onFocus={() => {
                      setHoveredSidebarTarget({ type: 'menu', menuKey });
                    }}
                    aria-expanded={showExpandedContent && openMenus[menuKey]}
                    className={menuButtonClassName}
                    style={menuButtonStyle}
                  >
                    <SidebarMenuLabel
                      collapsed={isVisuallyCollapsed}
                      icon={item.icon}
                      name={item.name}
                    />

                    {showExpandedContent ? (
                      <motion.div
                        animate={{
                          rotate: openMenus[menuKey] ? 180 : 0,
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="relative z-10"
                      >
                        <ChevronDownIcon />
                      </motion.div>
                    ) : null}
                  </button>

                  <AnimatePresence initial={false}>
                    {showExpandedContent && openMenus[menuKey] ? (
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
                          clearHighlightClearTimeout();
                          handleMenuMouseEnter(menuKey);
                        }}
                        onMouseLeave={() => {
                          scheduleHoveredSidebarClear(menuKey);
                        }}
                        className="overflow-hidden"
                      >
                        <motion.div
                          variants={submenuContainerVariants}
                          className="relative py-2 pl-5 pr-4"
                        >
                          <div className="absolute bottom-2 left-5 top-2 z-10 w-0.5 bg-slate-300" />

                          <AnimatePresence>
                            {activeChildIndex !== -1 ? (
                              <motion.div
                                layoutId={`active-submenu-indicator-${item.key}`}
                                className="absolute z-20 w-0.5 bg-primary"
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
                            ) : null}
                          </AnimatePresence>

                          {children.map((child, childIndex) => {
                            const isActiveChild = isSubmenuItemActive(
                              pathname,
                              child.path
                            );
                            const isHoveredChild =
                              hoveredSidebarItem?.type === 'submenu' &&
                              hoveredSidebarItem.menuKey === item.key &&
                              hoveredSidebarItem.index === childIndex;
                            const isHighlightedChild =
                              isHoveredChild ||
                              (!hoveredSidebarItem && isActiveChild);

                            return (
                              <div
                                ref={element => {
                                  setSidebarItemRef(
                                    {
                                      type: 'submenu',
                                      menuKey: item.key,
                                      index: childIndex,
                                    },
                                    element
                                  );
                                }}
                                key={child.path}
                                className="relative z-10"
                                style={{ height: SUBMENU_ITEM_HEIGHT }}
                                onMouseEnter={() => {
                                  setHoveredSidebarTarget({
                                    type: 'submenu',
                                    menuKey: item.key,
                                    index: childIndex,
                                  });
                                }}
                                onFocus={() => {
                                  setHoveredSidebarTarget({
                                    type: 'submenu',
                                    menuKey: item.key,
                                    index: childIndex,
                                  });
                                }}
                              >
                                <AnimatePresence>
                                  {isActiveChild ? (
                                    <motion.div
                                      className="absolute left-[-3px] top-5 z-30 h-2 w-2 -translate-y-0.5 rounded-full bg-primary"
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
                                  ) : null}
                                </AnimatePresence>

                                <motion.div
                                  variants={submenuItemVariants}
                                  className="relative z-10"
                                >
                                  <Link
                                    to={child.path}
                                    onClick={event => {
                                      if (
                                        child.path === ITEM_MASTER_PATH &&
                                        pathname.startsWith(
                                          ITEM_MASTER_PATH + '/'
                                        )
                                      ) {
                                        event.preventDefault();
                                      }
                                    }}
                                    className={`block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl px-6 py-3 text-sm transition-all duration-200 focus-visible:outline-hidden outline-hidden focus:outline-hidden active:outline-hidden ${
                                      isActiveChild || isHighlightedChild
                                        ? 'font-medium'
                                        : ''
                                    }`}
                                    style={{
                                      color:
                                        isActiveChild || isHighlightedChild
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
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            }

            const isHoveredMenu =
              hoveredSidebarItem?.type === 'menu' &&
              hoveredSidebarItem.menuKey === item.key;
            const isHighlightedMenu =
              isHoveredMenu || (!hoveredSidebarItem && isMenuActive);
            const menuButtonClassName = getMenuButtonClassName({
              isActive: isMenuActive,
              isHighlighted: isHighlightedMenu,
            });

            return (
              <div key={item.key} className="relative z-10">
                <button
                  ref={element => {
                    setSidebarItemRef({ type: 'menu', menuKey }, element);
                  }}
                  type="button"
                  onClick={() => {
                    if (pathname !== item.path) {
                      void navigate(item.path);
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveredSidebarTarget({ type: 'menu', menuKey });
                  }}
                  onMouseLeave={() => {
                    scheduleHoveredSidebarClear(menuKey);
                  }}
                  onFocus={() => {
                    setHoveredSidebarTarget({ type: 'menu', menuKey });
                  }}
                  className={menuButtonClassName}
                  style={menuButtonStyle}
                >
                  <SidebarMenuLabel
                    collapsed={isVisuallyCollapsed}
                    icon={item.icon}
                    name={item.name}
                  />
                </button>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 p-4 text-xs text-slate-500">
          <div className="h-4">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <AnimatePresence initial={false}>
                {showExpandedContent ? (
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
                ) : null}
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
