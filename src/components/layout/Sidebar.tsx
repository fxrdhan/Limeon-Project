import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    FaDatabase,
    FaBoxes,
    FaShoppingCart,
    // FaShoppingBag,
    // FaHospital,
    // FaChartBar,
    // FaCog,
    FaAngleDown,
    FaBars,
    FaChevronRight
} from "react-icons/fa";

interface SidebarProps {
    collapsed: boolean;
    toggleSidebar: () => void;
}

const Sidebar = ({ collapsed, toggleSidebar }: SidebarProps) => {
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        masterData: false,
        inventory: false,
        purchasing: false,
        sales: false,
        clinic: false,
        accounting: false,
        reports: false,
        settings: false,
    });

    // Menyimpan state menu yang dibuka sebelum collapse
    const [savedOpenMenus, setSavedOpenMenus] = useState<Record<string, boolean>>({});

    // Effect untuk menyimpan/mengembalikan state menu
    useEffect(() => {
        if (collapsed) {
            // Simpan state menu saat ini sebelum collapse
            setSavedOpenMenus({...openMenus});
            // Tutup semua menu saat collapsed
            setOpenMenus({
                masterData: false,
                inventory: false,
                purchasing: false,
                sales: false,
                clinic: false,
                accounting: false,
                reports: false,
                settings: false,
            });
        } else {
            // Kembalikan state menu sebelumnya saat expand
            setOpenMenus(savedOpenMenus);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsed]);

    const toggleMenu = (menu: string) => {
        if (!collapsed) {
            setOpenMenus((prev) => ({
                ...prev,
                [menu]: !prev[menu],
            }));
        }
    };

    return (
        <aside className={`bg-white shadow-md transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} relative`}>
            <div className={`p-4 bg-primary text-white ${collapsed ? 'justify-center' : 'flex justify-between items-center'}`}>
                {!collapsed && <h2 className="text-xl font-bold">Apotek App</h2>}
                <button 
                    onClick={toggleSidebar} 
                    className="p-1 rounded-full hover:bg-blue-600 focus:outline-none"
                >
                    {collapsed ? <FaChevronRight /> : <FaBars />}
                </button>
            </div>

            <nav className="mt-6">
                <Link
                    to="/"
                    className={`flex items-center ${collapsed ? 'justify-center' : ''} px-6 py-3 text-gray-700 hover:bg-gray-100`}
                >
                    {collapsed ? <i className="fas fa-home"></i> : <span className="mx-3">Dashboard</span>}
                </Link>

                {/* Master Data */}
                <div>
                    <button
                        onClick={() => toggleMenu("masterData")}
                        className="flex items-center justify-between w-full px-6 py-3 text-gray-700 hover:bg-gray-100"
                    >
                        <div className={`flex items-center ${collapsed ? 'justify-center w-full' : ''}`}>
                            <FaDatabase className="text-gray-500" />
                            {!collapsed && <span className="mx-3">Master Data</span>}
                        </div>
                        {!collapsed && <FaAngleDown
                            className={`transform ${openMenus.masterData ? "rotate-180" : ""
                                }`}
                        />}
                    </button>

                    {openMenus.masterData && !collapsed && (
                        <div className="pl-12 pr-6 py-2 bg-gray-50">
                            <Link
                                to="/master-data/items"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Daftar Item
                            </Link>
                            <Link
                                to="/master-data/categories"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Kategori Item
                            </Link>
                            <Link
                                to="/master-data/types"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Jenis Item
                            </Link>
                            <Link
                                to="/master-data/units"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Satuan
                            </Link>
                            <Link
                                to="/master-data/suppliers"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Supplier
                            </Link>
                            <Link
                                to="/master-data/patients"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Pasien
                            </Link>
                            <Link
                                to="/master-data/doctors"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Dokter
                            </Link>
                        </div>
                    )}
                </div>

                {/* Persediaan */}
                <div>
                    <button
                        onClick={() => toggleMenu("inventory")}
                        className="flex items-center justify-between w-full px-6 py-3 text-gray-700 hover:bg-gray-100"
                    >
                        <div className={`flex items-center ${collapsed ? 'justify-center w-full' : ''}`}>
                            <FaBoxes className="text-gray-500" />
                            {!collapsed && <span className="mx-3">Persediaan</span>}
                        </div>
                        {!collapsed && <FaAngleDown
                            className={`transform ${openMenus.inventory ? "rotate-180" : ""}`}
                        />}
                    </button>

                    {openMenus.inventory && !collapsed && (
                        <div className="pl-12 pr-6 py-2 bg-gray-50">
                            <Link
                                to="/inventory/stock"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Stok Obat
                            </Link>
                            <Link
                                to="/inventory/stock-opname"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Stok Opname
                            </Link>
                            <Link
                                to="/inventory/expired"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Obat Kadaluarsa
                            </Link>
                        </div>
                    )}
                </div>

                {/* Pembelian */}
                <div>
                    <button
                        onClick={() => toggleMenu("purchasing")}
                        className="flex items-center justify-between w-full px-6 py-3 text-gray-700 hover:bg-gray-100"
                    >
                        <div className={`flex items-center ${collapsed ? 'justify-center w-full' : ''}`}>
                            <FaShoppingCart className="text-gray-500" />
                            {!collapsed && <span className="mx-3">Pembelian</span>}
                        </div>
                        {!collapsed && <FaAngleDown
                            className={`transform ${openMenus.purchasing ? "rotate-180" : ""}`}
                        />}
                    </button>

                    {openMenus.purchasing && !collapsed && (
                        <div className="pl-12 pr-6 py-2 bg-gray-50">
                            <Link
                                to="/purchases/orders"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Daftar Pesanan Beli
                            </Link>
                            <Link
                                to="/purchases"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Daftar Pembelian
                            </Link>
                            <Link
                                to="/purchases/price-history"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Riwayat Harga Beli
                            </Link>
                        </div>
                    )}
                </div>

                {/* Tambahkan menu lain (Pembelian, Penjualan, Klinik, dll) dengan struktur yang sama */}
            </nav>
        </aside>
    );
};

export default Sidebar;
