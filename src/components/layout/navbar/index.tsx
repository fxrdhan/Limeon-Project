import { useNavigate } from 'react-router-dom';
import type { NavbarProps } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { ImageUploader } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaPencilAlt } from 'react-icons/fa';

// Helper component for animated time segments
const AnimatedTimeSegment = ({ value, widthClass }: { value: string; widthClass: string }) => (
    <div className={`inline-block ${widthClass} h-[1.2em] overflow-hidden align-bottom`}>
        <AnimatePresence initial={false} mode="popLayout">
            <motion.span
                key={value}
                initial={{ y: '100%', opacity: 0.5 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-80%', opacity: 0.5 }}
                transition={{ duration: 0.25, ease: [0.5, 0, 0.5, 1] }}
                className="inline-block"
            >
                {value}
            </motion.span>
        </AnimatePresence>
    </div>
);

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
    const { user, logout } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Clock state
    const [datePart, setDatePart] = useState('');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleLogout = async () => {
        await logout();
    };

    // Effect for clock updates
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const optionsDate: Intl.DateTimeFormatOptions = {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            };
            setDatePart(now.toLocaleDateString('id-ID', optionsDate));
            setHours(String(now.getHours()).padStart(2, '0'));
            setMinutes(String(now.getMinutes()).padStart(2, '0'));
            setSeconds(String(now.getSeconds()).padStart(2, '0'));
        };
        updateClock(); // initial call
        const timerId = setInterval(updateClock, 1000);
        return () => clearInterval(timerId);
    }, []);

    // Effect for dropdown click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen, dropdownRef]);

    return (
        <nav className="bg-white border-b px-6 py-3 sticky top-0 z-20">
            <div className="grid grid-cols-[1fr,auto,1fr] items-center">
                <div className="flex items-center h-8">
                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={sidebarCollapsed ? 'PharmaSys' : 'Pharmacy System App'}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="text-xl font-semibold text-gray-800"
                        >
                            {sidebarCollapsed ? 'PharmaSys' : 'Pharmacy System App'}
                        </motion.h1>
                    </AnimatePresence>
                </div>
                <div className="flex items-center justify-center space-x-3">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="p-2 pb-3 w-10 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Go Back"
                        title="Go Back"
                    >
                        <span className="text-gray-600 font-bold text-lg">&lt;</span>
                    </motion.button>

                    <div className="text-md font-mono text-blue-700 tracking-tight flex items-baseline tabular-nums">
                        {datePart && <span className="mr-1">{datePart} -</span>}
                        {hours ? (
                            <>
                                <AnimatedTimeSegment value={hours[0]} widthClass="w-[0.9ch]" />
                                <AnimatedTimeSegment value={hours[1]} widthClass="w-[0.9ch]" />
                            </>
                        ) : <span className="w-[1.8ch]">--</span>}
                        <span className="w-[0.5ch] text-center">:</span>
                        {minutes ? (
                            <>
                                <AnimatedTimeSegment value={minutes[0]} widthClass="w-[0.9ch]" />
                                <AnimatedTimeSegment value={minutes[1]} widthClass="w-[0.9ch]" />
                            </>
                        ) : <span className="w-[1.8ch]">--</span>}
                        <span className="w-[0.5ch] text-center">:</span>
                        {seconds ? (
                            <>
                                <AnimatedTimeSegment value={seconds[0]} widthClass="w-[0.9ch]" />
                                <AnimatedTimeSegment value={seconds[1]} widthClass="w-[0.9ch]" />
                            </>
                        ) : <span className="w-[1.8ch]">--</span>}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(1)}
                        className="p-2 pb-3 w-10 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Go Forward"
                        title="Go Forward"
                    >
                        <span className="text-gray-600 font-bold text-lg">&gt;</span>
                    </motion.button>
                </div>
                <div className="relative flex justify-end">
                    <button
                        className="flex items-center space-x-2"
                        onClick={toggleDropdown}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                    >
                        {user?.profilephoto ? (
                            <img src={user.profilephoto} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                                {user?.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle size={20} />}
                            </div>
                        )}
                        <span className="font-medium">{user?.name || 'User'}</span>
                    </button>

                    {dropdownOpen && (
                        <div
                            ref={dropdownRef}
                            className="absolute right-0 mt-10 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200 overflow-hidden"
                        >
                            <div className="p-4">
                                <div className="flex justify-center mb-3">
                                    <ImageUploader
                                        id="profile-upload"
                                        className="w-16 h-16"
                                        shape="full"
                                        onImageUpload={async (base64) => {
                                            setIsUploading(true);
                                            try {
                                                await useAuthStore.getState().updateProfilePhoto(base64);
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }}
                                        disabled={isUploading}
                                        defaultIcon={<FaPencilAlt className="text-white text-lg" />}
                                    >
                                        {user?.profilephoto ? (
                                            <img src={user.profilephoto} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-3xl">
                                                {user?.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle />}
                                            </div>
                                        )}
                                    </ImageUploader>
                                </div>
                                <p className="text-center text-sm text-gray-700 font-medium truncate" title={user?.email || ''}>
                                    {user?.email || 'Email tidak tersedia'}
                                </p>
                            </div>
                            <div className="border-t border-gray-100"></div>
                            <div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;