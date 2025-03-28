import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const MainLayout = () => {
    return (
        <div className="flex h-screen bg-gray-100 text-gray-800">
            <Sidebar />

            <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar />

                <main className="flex-1 overflow-y-auto p-4 text-gray-800">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
