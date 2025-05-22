import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
    FaDatabase,
    FaBoxes,
    FaShoppingCart,
    FaHome,
    FaChartBar,
    FaAngleDown,
    FaHospital,
    FaShoppingBag,
    FaCog
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import type { SidebarProps, MenuItem } from '@/types';

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

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const isActive = useCallback((path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    }, [location]);

    const hasActiveChild = useCallback((children?: { path: string }[]) => {
        if (!children) return false;
        return children.some(child => isActive(child.path));
    }, [isActive]);

    const toggleMenu = useCallback((menu: string) => {
        if (!collapsed) {
            setOpenMenus((prev) => ({
                ...prev,
                [menu]: !prev[menu],
            }));
        }
    }, [collapsed]);

    const handleMouseEnterSidebar = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (collapsed) {
            hoverTimeoutRef.current = setTimeout(() => {
                toggleSidebar();
            }, 100);
        }
    }, [collapsed, toggleSidebar]);

    const handleMouseLeaveSidebar = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (!collapsed) {
            toggleSidebar();
        }
    }, [collapsed, toggleSidebar]);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    return (
        <aside
            onMouseEnter={handleMouseEnterSidebar}
            onMouseLeave={handleMouseLeaveSidebar}      
            className={`bg-gradient-to-b from-teal-600 to-teal-800 text-white 
                        transition-all duration-500 ease-in-out h-screen 
                        ${collapsed ? 'w-16' : 'w-64'} relative group z-10`}
        >
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-primary/30 flex items-center">
                    <div className="flex items-center">
                        <div className="h-8 w-8 min-w-[2rem] bg-white rounded-md flex items-center justify-center flex-shrink-0">
                            <span className="text-teal-600 text-xl font-bold">P</span>
                        </div>
                        <h2 className={`ml-2 text-lg font-bold transition-opacity duration-200 ${collapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto'} text-white`}>
                            PharmaSys
                        </h2>
                    </div>
                </div>

                <nav className="flex-grow overflow-y-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {menuItems.map((item) => (
                        <div key={item.name} className="mb-1">
                            {item.children ? (
                                <>
                                    <button
                                        onClick={() => toggleMenu(item.name.toLowerCase().replace(' ', ''))}
                                        className={`w-full text-left flex items-center px-4 py-3 h-12 justify-between 
                                                ${isActive(item.path) || hasActiveChild(item.children)
                                                ? 'bg-teal-500/40 font-medium border-l-4 border-teal-100'
                                                : 'border-l-4 border-transparent hover:bg-teal-700/60'}
                                                transition-all duration-150 group relative`}
                                    >
                                        <div className="flex items-center overflow-hidden">
                                            <div className={`flex-shrink-0 flex items-center justify-center ${isActive(item.path) || hasActiveChild(item.children) ? 'text-teal-50' : 'text-teal-100'} transition-colors duration-200`}>
                                                {item.icon}
                                            </div>
                                            <span className={`ml-3 truncate text-white transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>{item.name}</span>
                                        </div>
                                        {!collapsed && item.children && (
                                            <FaAngleDown
                                                className={`text-sm text-teal-100/80 transition-transform duration-300 ease-in-out ${
                                                    openMenus[item.name.toLowerCase().replace(' ', '')] ? "rotate-180" : "rotate-0"
                                                }`}
                                            />
                                        )}
                                    </button>

                                    <div
                                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                            !collapsed && openMenus[item.name.toLowerCase().replace(' ', '')] ?
                                                'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                        }`}                  
                                    >                  
                                        <div className="pl-10 pr-1 py-0.5 bg-teal-900/50">
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.name}
                                                    to={child.path}
                                                    className={`block px-3 py-2 my-0.5 text-sm rounded-md transition duration-300 ease-in-out ${
                                                        isActive(child.path)
                                                        ? 'bg-teal-500/40 text-white font-medium hover:bg-teal-500/50 hover:text-white'
                                                        : 'text-teal-100 hover:bg-teal-600/40 hover:text-white'
                                                    } whitespace-nowrap overflow-hidden text-ellipsis`}
                                                >
                                                    {child.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Link
                                    to={item.path}
                                    className={`w-full text-left flex items-center px-4 py-3 h-12 
                                                ${isActive(item.path)
                                            ? 'bg-teal-500/40 font-medium border-l-4 border-teal-100'
                                            : 'border-l-4 border-transparent hover:bg-teal-700/60'}
                                                transition-all duration-150 group relative`}
                                >
                                    <div className="flex items-center overflow-hidden">
                                        <div className={`flex-shrink-0 flex items-center justify-center ${isActive(item.path) ? 'text-teal-50' : 'text-teal-100'} transition-colors duration-200`}>
                                            {item.icon}
                                        </div>
                                        <span className={`ml-3 truncate text-white transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>{item.name}</span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>

                <div className={`p-4 text-xs text-teal-200/70 border-t border-teal-500/30 mt-auto`}>
                    <div className="h-4">
                        <div style={{ display: 'inline-flex', alignItems: 'center', height: '100%' }}>
                            <AnimatePresence initial={false}>
                                {!collapsed && (
                                    <motion.div
                                        key="pharmasys-text"
                                        initial={{ opacity: 0, width: 0, marginRight: 0 }}
                                        animate={{ opacity: 1, width: 'auto', marginRight: '0.25em' }}
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
