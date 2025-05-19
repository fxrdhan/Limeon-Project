import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";

const MainLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="flex h-screen bg-gray-100 text-gray-800">
            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />

            <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar sidebarCollapsed={sidebarCollapsed} />

                <main className="flex-1 overflow-y-auto p-4 text-gray-800">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
