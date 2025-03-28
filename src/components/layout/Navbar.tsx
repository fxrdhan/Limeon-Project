// src/components/layout/Navbar.tsx
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';

const Navbar = () => {
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
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">PharmaSys</h1>
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