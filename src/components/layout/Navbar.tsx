// src/components/layout/Navbar.tsx
import { useState, useEffect } from 'react'; // Import useEffect
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
    const [currentTime, setCurrentTime] = useState('');

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleLogout = async () => {
        await logout();
    };

    // Effect to update time every second
    useEffect(() => {
        const timerId = setInterval(() => {
            const now = new Date();
            const optionsDate: Intl.DateTimeFormatOptions = {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            };
            
            // Format time manually to use colons instead of dots
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timeString = `${hours}:${minutes}:${seconds}`;
            
            const formattedTime = `${now.toLocaleDateString('id-ID', optionsDate)} - ${timeString}`;
            setCurrentTime(formattedTime);
        }, 1000);

        // Cleanup interval on component unmount
        return () => {
            clearInterval(timerId);
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <nav className="bg-white border-b px-6 py-3">
            {/* Use grid for three columns: Title, Clock, User Menu */}
            <div className="grid grid-cols-[1fr,auto,1fr] items-center">
                {/* Left: Title (conditionally animated) */}
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
                {/* Center: Real-time Clock */}
                <div className="text-center">
                    <span className="text-md font-mono text-blue-700 tracking-tight">
                        {currentTime || 'Memuat...'} {/* Display current time */}
                    </span>
                </div>

                {/* Right: User Dropdown */}
                <div className="relative flex justify-end">
                    <button
                        className="flex items-center space-x-2"
                        onClick={toggleDropdown}
                    >
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                            {/* Display first letter of user name or 'U' */}
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