import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Pie, Bar, Doughnut } from 'react-chartjs-2';
import { FaShoppingBag, FaShoppingCart, FaBoxes, FaExclamationTriangle } from 'react-icons/fa';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Dashboard = () => {
    const [demoMode, setDemoMode] = useState(false);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalPurchases: 0,
        totalMedicines: 0,
        lowStockCount: 0
    });

    const [salesData, setSalesData] = useState<{
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            borderColor: string;
            backgroundColor: string;
        }[];
    }>({
        labels: [],
        datasets: []
    });

    const [topMedicines, setTopMedicines] = useState<{
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string[];
            borderColor: string[];
            borderWidth: number;
        }[];
    }>({
        labels: [],
        datasets: []
    });

    useEffect(() => {
        if (!demoMode) {
            fetchStats();
            fetchSalesData();
            fetchTopMedicines();
        }
    }, []);

    const fetchStats = async () => {
        // Get total sales
        const { data: salesData } = await supabase
            .from('sales')
            .select('total');

        const totalSales = salesData
            ? salesData.reduce((sum, sale) => sum + sale.total, 0)
            : 0;

        // Get total purchases
        const { data: purchasesData } = await supabase
            .from('purchases')
            .select('total');

        const totalPurchases = purchasesData
            ? purchasesData.reduce((sum, purchase) => sum + purchase.total, 0)
            : 0;

        // Get total medicines
        const { count: totalMedicines } = await supabase
            .from('medicines')
            .select('*', { count: 'exact' });

        // Get low stock count
        const { count: lowStockCount } = await supabase
            .from('medicines')
            .select('*', { count: 'exact' })
            .lt('stock', 10);

        setStats({
            totalSales,
            totalPurchases,
            totalMedicines: totalMedicines || 0,
            lowStockCount: lowStockCount || 0
        });
    };

    const fetchSalesData = async () => {
        // Get sales data for the last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 6));
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data } = await supabase
            .from('sales')
            .select('date, total')
            .gte('date', sevenDaysAgo.toISOString())
            .order('date');

        if (!data) return;

        // Group by date
        const salesByDate = data.reduce<Record<string, number>>((acc, sale) => {
            const date = new Date(sale.date).toLocaleDateString();
            if (!acc[date]) acc[date] = 0;
            acc[date] += sale.total;
            return acc;
        }, {});

        // Generate data for the last 7 days
        const labels = [];
        const values = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toLocaleDateString();
            labels.push(dateStr);
            values.push(salesByDate[dateStr] || 0);
        }

        setSalesData({
            labels,
            datasets: [
                {
                    label: 'Penjualan Harian',
                    data: values,
                    borderColor: 'rgb(53, 162, 235)',
                    backgroundColor: 'rgba(53, 162, 235, 0.5)',
                }
            ]
        });
    };

    const fetchTopMedicines = async () => {
        // Get top 5 selling medicines
        const { data } = await supabase
            .rpc('get_top_selling_medicines', { limit_count: 5 });

        if (!data) return;

        interface TopSellingMedicine {
            name: string;
            total_quantity: number;
        }

        setTopMedicines({
            labels: data.map((item: TopSellingMedicine) => item.name),
            datasets: [
                {
                    label: 'Obat Terlaris',
                    data: data.map((item: TopSellingMedicine) => item.total_quantity),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1,
                }
            ]
        });
    };

    const toggleDemoMode = () => {
        setDemoMode(!demoMode);
    };

    return (
        <div className="min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                <button 
                    onClick={toggleDemoMode}
                    className={`px-4 py-2 rounded-md font-medium shadow-md border ${demoMode ? 'bg-red-500 text-white border-red-600' : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-700'}`}
                >
                    {demoMode ? 'Disable Demo Mode' : 'Demo Mode'}
                </button>
            </div>

            {demoMode ? (
                <ModernDashboard />
            ) : (
                <RegularDashboard 
                    stats={stats} 
                    salesData={salesData} 
                    topMedicines={topMedicines} 
                />
            )}
        </div>
    );
};

// Komponen untuk dashboard regular (asli)
const RegularDashboard = ({ stats, salesData, topMedicines }) => {
    return (
        <div>
            {/* <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1> */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 mr-4">
                            <FaShoppingBag className="text-blue-500 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-sm text-gray-500">Total Penjualan</h2>
                            <p className="text-xl font-semibold">
                                {stats.totalSales.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 mr-4">
                            <FaShoppingCart className="text-green-500 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-sm text-gray-500">Total Pembelian</h2>
                            <p className="text-xl font-semibold">
                                {stats.totalPurchases.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 mr-4">
                            <FaBoxes className="text-purple-500 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-sm text-gray-500">Total Obat</h2>
                            <p className="text-xl font-semibold">{stats.totalMedicines}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 mr-4">
                            <FaExclamationTriangle className="text-red-500 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-sm text-gray-500">Stok Menipis</h2>
                            <p className="text-xl font-semibold">{stats.lowStockCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Penjualan 7 Hari Terakhir</h2>
                    <div className="h-64">
                        <Line
                            data={salesData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Obat Terlaris</h2>
                    <div className="h-64">
                        <Pie
                            data={topMedicines}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Komponen untuk dashboard modern (mode demo)
const ModernDashboard = () => {
    // Data dummy untuk mode demo
    const demoData = {
        totalCustomer: 120,
        totalSales: 234,
        totalProfit: 456,
        outOfStock: 56,
        
        expiringMedicines: [
            { name: 'Doxycycline', expiryDate: '24 Dec 2021', quantity: 40 },
            { name: 'Abetis', expiryDate: '24 Dec 2021', quantity: 40 },
            { name: 'Disulfit 10ml', expiryDate: '24 Dec 2021', quantity: 40 },
            { name: 'Cerox CV', expiryDate: '24 Dec 2021', quantity: 40 },
            { name: 'Fluciox', expiryDate: '24 Dec 2021', quantity: 40 },
        ],
        
        recentOrders: [
            { medicine: 'Paricol 15mg', batchNo: '78367834', quantity: 40, status: 'Delivered', price: 23.00 },
            { medicine: 'Abetis 20mg', batchNo: '88832433', quantity: 40, status: 'Pending', price: 23.00 },
            { medicine: 'Cerox CV', batchNo: '76767634', quantity: 40, status: 'Cancelled', price: 23.00 },
            { medicine: 'Abetis 20mg', batchNo: '45578866', quantity: 40, status: 'Delivered', price: 23.00 },
            { medicine: 'Cerox CV', batchNo: '76767634', quantity: 40, status: 'Cancelled', price: 23.00 },
        ],
        
        monthlyData: [
            { month: 'Jan', value: 40 },
            { month: 'Feb', value: 35 },
            { month: 'Mar', value: 35 },
            { month: 'Apr', value: 45 },
            { month: 'May', value: 40 },
            { month: 'Jun', value: 50 },
            { month: 'Jul', value: 60 },
            { month: 'Aug', value: 40 },
            { month: 'Sep', value: 45 },
            { month: 'Oct', value: 40 },
            { month: 'Nov', value: 35 },
            { month: 'Dec', value: 30 },
        ],
        
        todayReport: {
            totalEarning: 5098.00,
            purchasePercentage: 65,
            cashReceivedPercentage: 75,
            bankReceivePercentage: 45,
            servicePercentage: 85
        }
    };
    
    // Data untuk Monthly Progress chart
    const monthlyProgressData = {
        labels: demoData.monthlyData.map(item => item.month),
        datasets: [
            {
                label: 'Penjualan Bulanan',
                data: demoData.monthlyData.map(item => item.value),
                backgroundColor: demoData.monthlyData.map(item => 
                    item.month === 'Jul' ? '#1a73e8' : '#4ade80'
                ),
                borderRadius: 6,
                borderSkipped: false,
            }
        ]
    };
    
    // Data untuk Today's Report chart (doughnut chart)
    const todayReportData = {
        labels: ['Pembelian', 'Penerimaan Tunai', 'Penerimaan Bank', 'Layanan'],
        datasets: [
            {
                data: [
                    demoData.todayReport.purchasePercentage,
                    demoData.todayReport.cashReceivedPercentage,
                    demoData.todayReport.bankReceivePercentage,
                    demoData.todayReport.servicePercentage
                ],
                backgroundColor: [
                    '#3b82f6',
                    '#f43f5e',
                    '#f97316',
                    '#4ade80'
                ],
                borderWidth: 0,
                cutout: '55%'
            }
        ]
    };

    return (
        <div className="bg-gray-50 p-6 rounded-xl">
            {/* Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Total Customer Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Customer</p>
                        <p className="text-2xl font-bold">{demoData.totalCustomer}</p>
                        <button className="text-xs text-primary mt-2">Lihat Detail</button>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-500">👥</span>
                    </div>
                </div>
                
                {/* Total Sale Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Sale</p>
                        <p className="text-2xl font-bold">{demoData.totalSales}</p>
                        <button className="text-xs text-primary mt-2">Lihat Detail</button>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-500">🛒</span>
                    </div>
                </div>
                
                {/* Total Profit Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Profit</p>
                        <p className="text-2xl font-bold">${demoData.totalProfit}</p>
                        <button className="text-xs text-primary mt-2">Lihat Detail</button>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-yellow-500">💰</span>
                    </div>
                </div>
                
                {/* Out of Stock Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Out of Stock</p>
                        <p className="text-2xl font-bold">{demoData.outOfStock}</p>
                        <button className="text-xs text-primary mt-2">Lihat Detail</button>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-500">⚠️</span>
                    </div>
                </div>
            </div>
            
            {/* Tables and Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Expiring List */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Expiring List</h2>
                        <button className="text-xs text-primary">Lihat Semua</button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-gray-500">
                                    <th className="pb-2">Medicine name</th>
                                    <th className="pb-2">Expiry Date</th>
                                    <th className="pb-2">Quantity</th>
                                    <th className="pb-2">Chart</th>
                                    <th className="pb-2">Return</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {demoData.expiringMedicines.map((medicine, index) => (
                                    <tr key={index} className="text-sm">
                                        <td className="py-3">{medicine.name}</td>
                                        <td className="py-3">{medicine.expiryDate}</td>
                                        <td className="py-3">{medicine.quantity}</td>
                                        <td className="py-3">
                                            <div className="h-6 w-10 text-green-500">📈</div>
                                        </td>
                                        <td className="py-3">
                                            <button className="text-gray-400">↩️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Recent Orders */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Recent Order's</h2>
                        <button className="text-xs text-primary">Lihat Semua</button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-gray-500">
                                    <th className="pb-2">Medicine name</th>
                                    <th className="pb-2">Batch No.</th>
                                    <th className="pb-2">Quantity</th>
                                    <th className="pb-2">Status</th>
                                    <th className="pb-2 text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {demoData.recentOrders.map((order, index) => (
                                    <tr key={index} className="text-sm">
                                        <td className="py-3">{order.medicine}</td>
                                        <td className="py-3">{order.batchNo}</td>
                                        <td className="py-3">{order.quantity}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs 
                                                ${order.status === 'Delivered' ? 'bg-blue-100 text-blue-600' : 
                                                  order.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' : 
                                                  'bg-red-100 text-red-600'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">${order.price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Progress */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Monthly Progress</h2>
                        <select className="text-sm border rounded px-2 py-1">
                            <option>Monthly</option>
                            <option>Weekly</option>
                            <option>Daily</option>
                        </select>
                    </div>
                    
                    <div className="h-64">
                        <Bar 
                            data={monthlyProgressData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                        callbacks: {
                                            title: (context) => {
                                                const label = context[0].label;
                                                if (label === 'Sep') {
                                                    return 'September';
                                                }
                                                return label;
                                            },
                                            label: (context) => {
                                                return `Sales: ${context.parsed.y}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        grid: {
                                            display: false
                                        }
                                    },
                                    x: {
                                        grid: {
                                            display: false
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
                
                {/* Today's Report */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Today's Report</h2>
                    
                    <div className="flex items-center justify-center">
                        <div className="h-64 w-64 relative flex items-center justify-center">
                            <Doughnut 
                                data={todayReportData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: false
                                        }
                                    }
                                }}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-sm text-gray-500">Total Earning</p>
                                <p className="text-xl font-bold">${demoData.todayReport.totalEarning.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="flex items-center mb-2"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Total Purchase</div>
                            <div className="flex items-center mb-2"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span> Cash Received</div>
                            <div className="flex items-center mb-2"><span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span> Bank Receive</div>
                            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Total Service</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
