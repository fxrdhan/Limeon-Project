import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";

const MainLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const expandSidebar = () => {
        if (!isLocked) {
            setSidebarCollapsed(false);
        }
    };

    const collapseSidebar = () => {
        if (!isLocked) {
            setSidebarCollapsed(true);
        }
    };

    const toggleLock = () => {
        setIsLocked((prevIsLocked) => {
            const newLockState = !prevIsLocked;
            if (newLockState && sidebarCollapsed) {
                setSidebarCollapsed(false);
            }
            return newLockState;
        });
    };

    return (
        <div className="flex h-screen bg-gray-100 text-gray-800">
            <Sidebar
                collapsed={sidebarCollapsed}
                isLocked={isLocked}
                toggleLock={toggleLock}
                expandSidebar={expandSidebar}
                collapseSidebar={collapseSidebar}
            />

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
