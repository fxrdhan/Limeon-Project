import { useNavigate } from 'react-router-dom';
import type { NavbarProps } from '@/types';
import { useState, useRef, useEffect } from 'react';
import ImageUploader  from '@/components/modules/image-uploader';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaPencilAlt, FaSignOutAlt, FaCog } from 'react-icons/fa';
import DateTimeDisplay from './live-datetime';

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
    const { user, logout } = useAuthStore();
    const [portalOpen, setPortalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const portalRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const togglePortal = () => {
        setPortalOpen(!portalOpen);
    };

    const handleLogout = async () => {
        await logout();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (portalRef.current && !portalRef.current.contains(event.target as Node)) {
                setPortalOpen(false);
            }
        };
        if (portalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [portalOpen, portalRef]);

    return (
        <nav className="bg-white border-b px-6 py-3 sticky top-0 z-20">
            <div className="grid grid-cols-[1fr,auto,1fr] items-center">
                <div className="flex items-center h-8">
                    <h1 className="text-xl font-semibold text-gray-800 flex items-baseline" style={{ minHeight: '1.5em' }}>
                        <span>Pharma</span>
                        <AnimatePresence>
                            {!sidebarCollapsed && (
                                <motion.span
                                    key="space_after_pharma_part"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                    &nbsp;
                                </motion.span>
                            )}
                        </AnimatePresence>
                        <span>Sys</span>
                        <AnimatePresence>
                            {!sidebarCollapsed && (
                                <motion.span
                                    key="tem_part"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2, delay: 0.05 }}
                                    style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                    tem
                                </motion.span>
                            )}
                            {!sidebarCollapsed && (
                                <motion.span
                                    key="app_part"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2, delay: 0.1 }}
                                    style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                    &nbsp;App
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </h1>
                </div>
                <div className="flex items-center justify-center space-x-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 pb-3 w-10 rounded-full group active:scale-90 transition-transform duration-100"
                        aria-label="Go Back"
                        title="Go Back"
                    >
                        <span className="text-gray-600 font-bold text-lg inline-block group-hover:text-primary group-hover:scale-120 transition duration-150">
                            &lt;
                        </span>
                    </button>

                    <DateTimeDisplay />

                    <button
                        onClick={() => navigate(1)}
                        className="p-2 pb-3 w-10 rounded-full group active:scale-90 transition-transform duration-100"
                        aria-label="Go Forward"
                        title="Go Forward"
                    >
                        <span className="text-gray-600 font-bold text-lg inline-block group-hover:text-primary group-hover:scale-120 transition duration-150">
                            &gt;
                        </span>
                    </button>
                </div>
                <div className="relative flex justify-end">
                    <button
                        className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                        onClick={togglePortal}
                        aria-expanded={portalOpen}
                        aria-haspopup="true"
                    >
                        <div className="relative">
                            {user?.profilephoto ? (
                                <img 
                                    src={user.profilephoto} 
                                    alt="Profile" 
                                    className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-primary/30 transition-all duration-200" 
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center ring-2 ring-gray-200 group-hover:ring-primary/30 transition-all duration-200">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle size={20} />}
                                </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                        </div>
                    </button>

                    <AnimatePresence>
                        {portalOpen && (
                            <motion.div
                                ref={portalRef}
                                initial={{ opacity: 0, scale: 0, transformOrigin: "top right" }}
                                animate={{ opacity: 1, scale: 1, transformOrigin: "top right" }}
                                exit={{ opacity: 0, scale: 0, transformOrigin: "top right" }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="fixed top-0 right-0 w-80 bg-white rounded-bl-2xl shadow-xl z-50 border border-gray-100 overflow-hidden backdrop-blur-sm"
                                style={{ marginTop: '0px' }}
                            >
                                <div className="p-4">
                                    <div className="flex flex-col items-center mb-4">
                                        <div className="relative group/upload">
                                            <ImageUploader
                                                id="profile-upload"
                                                className="w-24 h-24"
                                                shape="full"
                                                onImageUpload={async (file: File) => {
                                                    setIsUploading(true);
                                                    try {
                                                        await useAuthStore.getState().updateProfilePhoto(file);
                                                    } finally {
                                                        setIsUploading(false);
                                                    }
                                                }}
                                                disabled={isUploading}
                                                defaultIcon={<FaPencilAlt className="text-white text-sm" />}
                                            >
                                                {user?.profilephoto ? (
                                                    <img 
                                                        src={user.profilephoto} 
                                                        alt="Profile" 
                                                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 group-hover/upload:border-primary/30 transition-all duration-200" 
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-2xl border-4 border-gray-100 group-hover/upload:border-primary/30 transition-all duration-200">
                                                        {user?.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle />}
                                                    </div>
                                                )}
                                            </ImageUploader>
                                            {isUploading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 text-center">
                                            <h3 className="font-semibold text-gray-800 text-lg">{user?.name || 'User'}</h3>
                                            <p className="text-sm text-gray-500 mb-1">{user?.role || 'Staff'}</p>
                                            <p className="text-xs text-gray-400 truncate max-w-[200px]" title={user?.email || ''}>
                                                {user?.email || 'Email tidak tersedia'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-100"></div>
                                
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            setPortalOpen(false);
                                            // Navigate to profile settings
                                        }}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150 group"
                                    >
                                        <FaCog className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                                        <span>Pengaturan Profil</span>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 group"
                                    >
                                        <FaSignOutAlt className="text-red-500 group-hover:text-red-600 transition-colors" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;