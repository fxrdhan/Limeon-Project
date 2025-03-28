import { Link } from "react-router-dom";
import { useState } from "react";
import {
    FaDatabase,
    FaBoxes,
    FaShoppingCart,
    FaShoppingBag,
    FaHospital,
    FaChartBar,
    FaCog,
    FaAngleDown,
} from "react-icons/fa";

const Sidebar = () => {
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

    const toggleMenu = (menu: string) => {
        setOpenMenus((prev) => ({
            ...prev,
            [menu]: !prev[menu],
        }));
    };

    return (
        <aside className="w-64 bg-white shadow-md">
            <div className="p-4 bg-primary text-white">
                <h2 className="text-xl font-bold">Apotek & Klinik</h2>
            </div>

            <nav className="mt-6">
                <Link
                    to="/"
                    className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
                >
                    <span className="mx-3">Dashboard</span>
                </Link>

                {/* Master Data */}
                <div>
                    <button
                        onClick={() => toggleMenu("masterData")}
                        className="flex items-center justify-between w-full px-6 py-3 text-gray-700 hover:bg-gray-100"
                    >
                        <div className="flex items-center">
                            <FaDatabase className="text-gray-500" />
                            <span className="mx-3">Master Data</span>
                        </div>
                        <FaAngleDown
                            className={`transform ${openMenus.masterData ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {openMenus.masterData && (
                        <div className="pl-12 pr-6 py-2 bg-gray-50">
                            <Link
                                to="/master-data/medicines"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Obat/Resep
                            </Link>
                            <Link
                                to="/master-data/categories"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Kategori Obat
                            </Link>
                            <Link
                                to="/master-data/types"
                                className="block py-2 text-sm text-gray-600 hover:text-primary"
                            >
                                Jenis Obat
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
                        <div className="flex items-center">
                            <FaBoxes className="text-gray-500" />
                            <span className="mx-3">Persediaan</span>
                        </div>
                        <FaAngleDown
                            className={`transform ${openMenus.inventory ? "rotate-180" : ""}`}
                        />
                    </button>

                    {openMenus.inventory && (
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

                {/* Tambahkan menu lain (Pembelian, Penjualan, Klinik, dll) dengan struktur yang sama */}
            </nav>
        </aside>
    );
};

export default Sidebar;
