import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react"; // Add useRef
import { useLocation } from "react-router-dom";
import {
    FaDatabase,
    FaBoxes,
    FaShoppingCart,
    FaHome,
    FaChartBar,
    FaAngleDown, // Import FaAngleDown
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

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timer reference for hover delay

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

    // Handle hover enter on the entire sidebar area
    const handleMouseEnterSidebar = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (collapsed) {
            hoverTimeoutRef.current = setTimeout(() => {
                toggleSidebar(); // Expand the sidebar
            }, 100);
        }
    }, [collapsed, toggleSidebar]);

    // Handle hover leave from the entire sidebar area
    const handleMouseLeaveSidebar = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (!collapsed) {
            toggleSidebar(); // Collapse the sidebar
        }
    }, [collapsed, toggleSidebar]);

    // Clear timeout on component unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    return (
        <aside
            onMouseEnter={handleMouseEnterSidebar} // Add mouse enter handler
            onMouseLeave={handleMouseLeaveSidebar} // Add mouse leave handler
            className={`bg-gradient-to-b from-blue-600 to-blue-800 text-white 
                        transition-all duration-500 ease-in-out h-screen 
                        ${collapsed ? 'w-16' : 'w-64'} relative group z-10`}
        >
            {/* Ensure flex-col and h-full */}
            <div className="flex flex-col h-full">
                {/* Logo Area */}
                {/* Remove justify-between to keep logo left aligned when collapsed */}
                <div className="p-4 border-b border-blue-500/30 flex items-center"> {/* Removed conditional justify-center */}
                    {/* Simplified logo rendering */}
                    <div className="flex items-center">
                        {/* Logo P */}
                        <div className="h-8 w-8 min-w-[2rem] bg-white rounded-md flex items-center justify-center flex-shrink-0"> {/* Added flex-shrink-0 */}
                            <span className="text-blue-600 text-xl font-bold">P</span>
                        </div>
                        <h2 className={`ml-2 text-lg font-bold transition-opacity duration-200 ${collapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto'}`}> {/* Animate text visibility */}
                            PharmaSys
                        </h2>
                    </div>
                </div>

                {/* Menu Items with hidden scrollbar */}
                <nav className="flex-grow overflow-y-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"> {/* Added hidden scrollbar styles */}
                    {menuItems.map((item) => (
                        <div key={item.name} className="mb-1">
                            {item.children ? (
                                <> {/* Use Fragment to group button and submenu */}
                                    <button // Button for expandable menus
                                        onClick={() => toggleMenu(item.name.toLowerCase().replace(' ', ''))}
                                        className={`w-full text-left flex items-center px-4 py-3 h-12 justify-between {/* Use px-4 for consistent padding, fixed height, add justify-between */}
                                                  ${isActive(item.path) || hasActiveChild(item.children)
                                                ? 'bg-white/20 font-medium border-l-4 border-white'
                                                : 'border-l-4 border-transparent hover:bg-white/5'}
                                                  transition-all duration-150 group relative`}
                                    >
                                        {/* Icon and Text Wrapper */}
                                        <div className="flex items-center overflow-hidden"> {/* Added overflow-hidden */}
                                            {/* Icon Container: Fixed width, centered */}
                                            <div className={`flex-shrink-0 flex items-center justify-center ${isActive(item.path) || hasActiveChild(item.children) ? 'text-white' : 'text-blue-100'} transition-colors duration-200`}>
                                                {item.icon}
                                            </div>
                                            {/* Text Span: Animate opacity and max-width for smooth transition */}
                                            <span className={`ml-3 truncate text-white transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>{item.name}</span>
                                        </div>
                                        {/* Arrow Icon for dropdown */}
                                        {!collapsed && item.children && (
                                            <FaAngleDown
                                                className={`text-sm text-blue-100/80 transition-transform duration-300 ease-in-out ${
                                                    openMenus[item.name.toLowerCase().replace(' ', '')] ? "rotate-180" : "rotate-0"
                                                }`}
                                            />
                                        )}
                                    </button>

                                    {/* Submenu container - Animate max-height and opacity */}
                                    <div
                                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                            !collapsed && openMenus[item.name.toLowerCase().replace(' ', '')] ? // Only show if NOT collapsed AND open
                                                'max-h-96 opacity-100' : 'max-h-0 opacity-0' // Hide if collapsed OR closed
                                        }`}
                                    >
                                        <div className="pl-10 pr-2 py-1 bg-black/10"> {/* Padding moved inside */}
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.name}
                                                    to={child.path}
                                                    className={`block px-3 py-2 my-0.5 text-sm rounded-md transition-colors transition-opacity duration-300 ease-in-out ${
                                                        isActive(child.path)
                                                        ? 'bg-white/20 text-white font-medium hover:bg-white/20 hover:text-white'
                                                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                                                    } whitespace-nowrap overflow-hidden text-ellipsis`} // Ensure text stays on one line and add ellipsis if needed
                                                >
                                                    {child.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Link // Link for non-expandable menus
                                    to={item.path}
                                    className={`w-full text-left flex items-center px-4 py-3 h-12 {/* Use px-4 for consistent padding, fixed height */}
                                                  ${isActive(item.path)
                                            ? 'bg-white/20 font-medium border-l-4 border-white'
                                            : 'border-l-4 border-transparent hover:bg-white/5'}
                                                  transition-all duration-150 group relative`}
                                >
                                    {/* Icon and Text Wrapper */}
                                    <div className="flex items-center overflow-hidden"> {/* Added overflow-hidden */}
                                        {/* Icon Container: Fixed width, centered */}
                                        <div className={`flex-shrink-0 flex items-center justify-center ${isActive(item.path) ? 'text-white' : 'text-blue-100'} transition-colors duration-200`}>
                                            {item.icon}
                                        </div>
                                        {/* Text Span: Animate opacity and max-width */}
                                        <span className={`ml-3 truncate text-white transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>{item.name}</span>
                                    </div>
                                </Link>
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
