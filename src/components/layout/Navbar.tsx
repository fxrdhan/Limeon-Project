// src/components/layout/Navbar.tsx
import { useState, useEffect, useRef } from 'react'; // Added useRef
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
    sidebarCollapsed: boolean;
}

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
    const { user, logout } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown container

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleLogout = async () => {
        await logout();
    };

    useEffect(() => {
        // Function to handle clicks outside the dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        // Add event listener when dropdown is open
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        // Clock update logic
        const timerId = setInterval(() => {
            const now = new Date();
            const optionsDate: Intl.DateTimeFormatOptions = {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            };

            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timeString = `${hours}:${minutes}:${seconds}`;

            const formattedTime = `${now.toLocaleDateString('id-ID', optionsDate)} - ${timeString}`;
            setCurrentTime(formattedTime);
        }, 1000);

        // Cleanup interval and event listener on component unmount or when dropdown closes
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            clearInterval(timerId);
        };
    }, [dropdownOpen]); // Re-run effect when dropdownOpen changes

    return (
        <nav className="bg-white border-b px-6 py-3">
            <div className="grid grid-cols-[1fr,auto,1fr] items-center">
                <div className="flex items-center h-8">
                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={sidebarCollapsed ? 'PharmaSys' : 'Pharmacy System App'}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="text-xl font-semibold text-gray-800 transition-opacity duration-300 ease-in-out"
                        >
                            {sidebarCollapsed ? 'PharmaSys' : 'Pharmacy System App'}
                        </motion.h1>
                    </AnimatePresence>
                </div>
                <div className="text-center">
                    <span className="text-md font-mono text-blue-700 tracking-tight">
                        {currentTime || 'Memuat...'}
                    </span>
                </div>
                <div className="relative flex justify-end">
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
                        <div
                            ref={dropdownRef}
                            className="absolute right-0 mt-10 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                        >
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