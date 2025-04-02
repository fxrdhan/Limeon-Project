import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
    FaDatabase,
    FaBoxes,
    FaShoppingCart,
    FaHome,
    FaArrowLeft,
    FaAngleDown,
    FaChartBar,
    FaHospital,
    FaShoppingBag,
    FaCog
} from "react-icons/fa";
import { JSX } from "react/jsx-runtime";

interface SidebarProps {
    collapsed: boolean;
    toggleSidebar: () => void;
}

interface MenuItem {
    name: string;
    path: string;
    icon: JSX.Element;
    children?: {
        name: string;
        path: string;
    }[];
}

const Sidebar = ({ collapsed, toggleSidebar }: SidebarProps) => {
    const location = useLocation();
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

    const [savedOpenMenus, setSavedOpenMenus] = useState<Record<string, boolean>>({});
    const [hoverMenu, setHoverMenu] = useState<string | null>(null);

    // Define menu structure
    const menuItems: MenuItem[] = [
        {
            name: "Dashboard",
            path: "/",
            icon: <FaHome className="text-lg" />,
        },
        {
            name: "Master Data",
            path: "/master-data",
            icon: <FaDatabase className="text-lg" />,
            children: [
                { name: "Daftar Item", path: "/master-data/items" },
                { name: "Kategori Item", path: "/master-data/categories" },
                { name: "Jenis Item", path: "/master-data/types" },
                { name: "Satuan", path: "/master-data/units" },
                { name: "Supplier", path: "/master-data/suppliers" },
                { name: "Pasien", path: "/master-data/patients" },
                { name: "Dokter", path: "/master-data/doctors" },
            ],
        },
        {
            name: "Persediaan",
            path: "/inventory",
            icon: <FaBoxes className="text-lg" />,
            children: [
                { name: "Stok Obat", path: "/inventory/stock" },
                { name: "Stok Opname", path: "/inventory/stock-opname" },
                { name: "Obat Kadaluarsa", path: "/inventory/expired" },
            ],
        },
        {
            name: "Pembelian",
            path: "/purchases",
            icon: <FaShoppingCart className="text-lg" />,
            children: [
                { name: "Daftar Pesanan Beli", path: "/purchases/orders" },
                { name: "Daftar Pembelian", path: "/purchases" },
                { name: "Riwayat Harga Beli", path: "/purchases/price-history" },
            ],
        },
        {
            name: "Penjualan",
            path: "/sales",
            icon: <FaShoppingBag className="text-lg" />,
            children: [
                { name: "Daftar Penjualan", path: "/sales" },
                { name: "Tambah Penjualan", path: "/sales/create" },
            ],
        },
        {
            name: "Klinik",
            path: "/clinic",
            icon: <FaHospital className="text-lg" />,
            children: [
                { name: "Daftar Pasien", path: "/clinic/patients" },
                { name: "Antrian", path: "/clinic/queue" },
                { name: "Rekam Medis", path: "/clinic/medical-records" },
            ],
        },
        {
            name: "Laporan",
            path: "/reports",
            icon: <FaChartBar className="text-lg" />,
            children: [
                { name: "Penjualan", path: "/reports/sales" },
                { name: "Pembelian", path: "/reports/purchases" },
                { name: "Stok", path: "/reports/stock" },
            ],
        },
        {
            name: "Pengaturan",
            path: "/settings",
            icon: <FaCog className="text-lg" />,
            children: [
                { name: "Profil", path: "/settings/profile" },
                { name: "Pengguna", path: "/settings/users" },
                { name: "Aplikasi", path: "/settings/app" },
            ],
        },
    ];

    useEffect(() => {
        if (collapsed) {
            setSavedOpenMenus({ ...openMenus });
            setOpenMenus({
                masterData: false,
                inventory: false,
                purchasing: false,
                sales: false,
                clinic: false,
                finance: false,
                reports: false,
                settings: false,
            });
        } else {
            setOpenMenus(savedOpenMenus);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsed]);

    // Check if path is active
    const isActive = useCallback((path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    }, [location]);

    // Check if submenu is active
    const hasActiveChild = useCallback((children?: { path: string }[]) => {
        if (!children) return false;
        return children.some(child => isActive(child.path));
    }, [isActive]);

    // Toggle menu open/closed
    const toggleMenu = useCallback((menu: string) => {
        if (!collapsed) {
            setOpenMenus((prev) => ({
                ...prev,
                [menu]: !prev[menu],
            }));
        }
    }, [collapsed]);

    // Handle hover for collapsed sidebar
    const handleMouseEnter = useCallback((menu: string) => {
        if (collapsed) {
            setHoverMenu(menu);
        }
    }, [collapsed]);

    const handleMouseLeave = useCallback(() => {
        setHoverMenu(null);
    }, []);

    return (
        <aside
            className={`bg-gradient-to-b from-blue-600 to-blue-800 text-white 
                        transition-all duration-500 ease-in-out h-screen 
                        ${collapsed ? 'w-16' : 'w-64'} relative group z-10`}
        >
            <div className="flex flex-col h-full">
                {/* Logo Area */}
                <div className={`p-4 border-b border-blue-500/30 flex items-center justify-between group`}>
                    {!collapsed ? (
                        <>
                        <div className="flex items-center">
                            <div className="h-8 w-8 bg-white rounded-md flex items-center justify-center">
                                <span className="text-blue-600 text-xl font-bold">P</span>
                            </div>
                            <h2 className="ml-2 text-lg font-bold transition-opacity duration-200">PharmaSys</h2>
                        </div>
                        <button onClick={toggleSidebar} className="p-1.5 rounded-full bg-blue-500/20 hover:bg-blue-500/40 transition-all duration-300">
                            <FaArrowLeft size={14} />
                        </button>
                        </>
                    ) : (
                        <div className="h-8 w-8 bg-white rounded-md flex items-center justify-center mx-auto cursor-pointer" onClick={toggleSidebar}>
                            <span className="text-blue-600 text-xl font-bold">P</span>
                        </div>
                    )}
                </div>

                {/* Menu Items */}
                <nav className="flex-grow overflow-y-auto py-2 scrollbar-thin">
                    {menuItems.map((item) => (
                        <div key={item.name} className="mb-1" onMouseEnter={() => handleMouseEnter(item.name)} onMouseLeave={handleMouseLeave}>
                            {/* Menu Item Button */}
                            {item.children ? (
                                <button
                                    onClick={() => toggleMenu(item.name.toLowerCase().replace(' ', ''))}
                                    className={`w-full text-left flex items-center justify-between px-2 py-3
                                              ${isActive(item.path) || hasActiveChild(item.children)
                                            ? 'bg-white/20 font-medium border-l-4 border-white'
                                            : collapsed ? '' : 'border-l-4 border-transparent'} 
                                                : 'hover:bg-white/5'} 
                                              transition-all duration-150 group relative`}
                                >
                                    <div className={`flex items-center ${collapsed ? 'justify-start pl-3 w-full' : ''}`}>
                                        <div className={`${isActive(item.path) || hasActiveChild(item.children)
                                            ? 'text-white'
                                            : 'text-blue-100'} 
                                                      transition-colors duration-200`}>
                                            {item.icon}
                                        </div>
                                        {!collapsed && <span className="ml-3 truncate text-white">{item.name}</span>}
                                    </div>
                                    {!collapsed && <FaAngleDown
                                        className={`text-sm transition-transform duration-300 ${openMenus[item.name.toLowerCase().replace(' ', '')] ? "rotate-180" : ""
                                            }`}
                                    />}
                                </button>
                            ) : (
                                <Link to={item.path}
                                className={`w-full text-left flex items-center justify-between px-2 py-3
                                          ${isActive(item.path) || hasActiveChild(item.children)
                                        ? 'bg-white/20 font-medium border-l-4 border-white'
                                        : collapsed ? '' : 'border-l-4 border-transparent'} 
                                            : 'hover:bg-white/5'} 
                                          transition-all duration-150 group relative`}
                                >
                                    <div className={`flex items-center ${collapsed ? 'justify-start pl-3 w-full' : ''}`}>
                                        <div className={`${isActive(item.path) || hasActiveChild(item.children)
                                        ? 'text-white'
                                        : 'text-blue-100'} 
                                                  transition-colors duration-200`}>
                                            {item.icon}
                                        </div>
                                    {!collapsed && (
                                        <span className="ml-3 truncate text-white">{item.name}</span>
                                    )}
                                </div>
                            </Link>
                            )}

                            {/* Submenu Items */}
                            {item.children && !collapsed && (
                                <div 
                                    className={`overflow-hidden transition-all duration-300 ease-in-out transform ${
                                        openMenus[item.name.toLowerCase().replace(' ', '')] 
                                            ? 'max-h-96 opacity-100 scale-y-100 origin-top' 
                                            : 'max-h-0 opacity-0 scale-y-95 origin-top'
                                    }`}
                                >
                                    <div className="pl-12 pr-4 py-1 space-y-1 bg-blue-700/20">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.path}
                                                to={child.path}
                                                className={`block py-2 px-2 text-sm rounded-md transition-all duration-150 text-blue-100 hover:text-white visited:text-blue-100 
                                                           ${isActive(child.path)
                                                    ? 'bg-white/20 text-white font-medium'
                                                    : 'text-blue-100 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Submenu dropdown for collapsed sidebar on hover */}
                            {collapsed && item.children && hoverMenu === item.name && (
                                <div
                                    className="absolute left-full ml-2 top-0 bg-blue-800 rounded-md py-2 px-3 
                                            min-w-40 z-20 shadow-xl"
                                >
                                    {item.children.map((child) => (
                                        <Link
                                            key={child.path}
                                            to={child.path}
                                            className={`block py-2 px-2 text-sm rounded-md transition-all duration-150 text-blue-100 hover:text-white visited:text-blue-100 
                                                      ${isActive(child.path)
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-blue-100 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            {child.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Bottom version info */}
                <div className={`p-4 text-xs text-blue-200/70 border-t border-blue-500/30 ${collapsed ? 'text-center' : ''}`}>
                    {collapsed ? 'v2.3' : 'PharmaSys v2.3.0'}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
