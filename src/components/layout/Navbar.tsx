// src/components/layout/Navbar.tsx
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
// Import motion and AnimatePresence from framer-motion
import { motion, AnimatePresence } from 'framer-motion';

// Define props interface
interface NavbarProps {
    sidebarCollapsed: boolean;
}

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
    const { user, logout } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <nav className="bg-white border-b px-6 py-3">
            <div className="flex justify-between items-center">
                {/* Conditionally render Navbar title with animation */}
                <div className="flex items-center h-8">
                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={sidebarCollapsed ? 'PharmaSys' : 'Pharmacy System App'}
                            initial={{ opacity: 0, x: -10 }} // Start state: invisible and slightly to the left
                            animate={{ opacity: 1, x: 0 }} // Animate to: fully visible and original horizontal position
                            exit={{ opacity: 0, x: 10 }} // Exit state: invisible and slightly to the right
                            transition={{ duration: 0.2 }} // Animation duration
                            className="text-xl font-semibold text-gray-800 transition-opacity duration-300 ease-in-out"
                        >
                            {sidebarCollapsed ? 'PharmaSys' : 'Pharmacy System App'}
                        </motion.h1>
                    </AnimatePresence>
                </div>

                <div className="relative">
                    <button
                        className="flex items-center space-x-2"
                        onClick={toggleDropdown}
                    >
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="font-medium">{user?.name || 'User'}</span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                            <div className="py-1">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start rounded-none"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;