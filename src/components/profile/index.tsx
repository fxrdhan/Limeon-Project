import { useState, useRef, useEffect } from 'react';
import ImageUploader from '@/components/image-manager';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { TbLogout, TbPencil, TbSettings, TbUserCircle } from 'react-icons/tb';

const Profile = () => {
  const { user, logout } = useAuthStore();
  const [portalOpen, setPortalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [animatingPortal, setAnimatingPortal] = useState(false);

  const portalRef = useRef<HTMLDivElement>(null);

  const glowShadows = [
    '0 0 15px rgba(99, 102, 241, 0.7), 0 0 30px rgba(99, 102, 241, 0.5), 0 0 45px rgba(99, 102, 241, 0.3)',
    '0 0 20px rgba(245, 158, 11, 0.8), 0 0 40px rgba(239, 68, 68, 0.6), 0 0 60px rgba(236, 72, 153, 0.4)',
    '0 0 18px rgba(16, 185, 129, 0.8), 0 0 35px rgba(6, 182, 212, 0.6), 0 0 55px rgba(59, 130, 246, 0.4)',
    '0 0 22px rgba(139, 92, 246, 0.9), 0 0 45px rgba(217, 70, 239, 0.7), 0 0 65px rgba(245, 158, 11, 0.5)',
    '0 0 15px rgba(99, 102, 241, 0.7), 0 0 30px rgba(99, 102, 241, 0.5), 0 0 45px rgba(99, 102, 241, 0.3)',
  ];

  const glowTransition = {
    repeat: Infinity,
    duration: 4,
    ease: 'easeInOut' as const,
  };

  const backgroundGradients = [
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
    'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #f59e0b 100%)',
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
  ];

  const handleProfileClick = () => {
    setAnimatingPortal(true);
    setPortalOpen(!portalOpen);
  };

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    if (animatingPortal) {
      const timer = setTimeout(() => {
        setAnimatingPortal(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [animatingPortal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Check if click is inside the profile portal
      if (portalRef.current && portalRef.current.contains(target)) {
        return;
      }

      // Check if click is on ImageUploader popup (rendered via portal)
      const imageUploaderPopup = target.closest('[class*="z-[9999]"]');
      if (imageUploaderPopup) {
        return;
      }

      // Close the profile modal only if click is truly outside
      setAnimatingPortal(true);
      setPortalOpen(false);
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

  const ProfileImage = ({ size = 'small', className = '' }) => {
    const sizeClass =
      size === 'small'
        ? 'w-11 h-11'
        : size === 'large'
          ? 'w-32 h-32'
          : 'w-24 h-24';
    const textSizeClass =
      size === 'small' ? 'text-sm' : size === 'large' ? 'text-3xl' : 'text-2xl';

    return user?.profilephoto ? (
      <img
        src={user.profilephoto}
        alt="Profile"
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    ) : (
      <div
        className={`${sizeClass} rounded-full bg-linear-to-br from-primary to-primary/80 text-white flex items-center justify-center ${textSizeClass} ${className}`}
      >
        {user?.name ? (
          user.name.charAt(0).toUpperCase()
        ) : (
          <TbUserCircle
            className={
              size === 'small'
                ? 'text-base'
                : size === 'large'
                  ? 'text-3xl'
                  : ''
            }
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <button
        onClick={handleProfileClick}
        className="flex items-center space-x-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
        aria-expanded={portalOpen}
        aria-haspopup="true"
      >
        <div className="relative">
          <AnimatePresence>
            {!portalOpen && (
              <motion.div
                initial={
                  animatingPortal ? { opacity: 0, scale: 1.5 } : { opacity: 1 }
                }
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 2.5, y: -20, x: 20 }}
                transition={{ duration: 0.25 }}
                className="relative"
              >
                <motion.div
                  className="relative"
                  animate={{
                    boxShadow: glowShadows,
                  }}
                  transition={{
                    boxShadow: glowTransition,
                  }}
                  style={{
                    borderRadius: '50%',
                  }}
                >
                  <ProfileImage
                    size="small"
                    className="transition-all duration-200"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      <AnimatePresence>
        {portalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40"
            />
            <motion.div
              ref={portalRef}
              initial={{
                opacity: 0,
                scale: 0.8,
                transformOrigin: 'top right',
              }}
              animate={{
                opacity: 1,
                scale: [0.8, 1.05, 1],
                transformOrigin: 'top right',
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                transformOrigin: 'top right',
              }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
                scale: {
                  times: [0, 0.6, 1],
                  duration: 0.3,
                },
              }}
              className="fixed top-0 right-0 w-72 bg-white rounded-bl-2xl shadow-xl z-50 border border-gray-100 overflow-hidden backdrop-blur-xs"
              style={{ marginTop: '0px' }}
            >
              <div className="p-4 pt-6">
                <div className="flex flex-col items-center">
                  <div className="mb-4">
                    <motion.div
                      className="text-white px-4 py-1.5 rounded-full text-xs font-medium relative overflow-hidden"
                      initial={{
                        y: -20,
                        opacity: 0,
                        backgroundImage:
                          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
                        boxShadow:
                          '0 0 15px rgba(99, 102, 241, 0.7), 0 0 30px rgba(99, 102, 241, 0.5), 0 0 45px rgba(99, 102, 241, 0.3)',
                      }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        backgroundImage: backgroundGradients,
                        boxShadow: glowShadows,
                      }}
                      exit={{
                        y: -20,
                        opacity: 0,
                      }}
                      transition={{
                        y: { duration: 0.3, delay: 0.1, ease: 'easeOut' },
                        opacity: {
                          duration: 0.3,
                          delay: 0.1,
                          ease: 'easeOut',
                        },
                        backgroundImage: {
                          repeat: Infinity,
                          duration: 5,
                          ease: 'easeInOut',
                          delay: 0.4,
                        },
                        boxShadow: {
                          ...glowTransition,
                          duration: 5,
                          delay: 0.4,
                        },
                      }}
                    >
                      <span className="flex items-center space-x-1.5">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="font-bold">Pro Plan</span>
                      </span>
                    </motion.div>
                  </div>
                  <div className="relative group/upload">
                    <motion.div
                      initial={{
                        scale: 0.4,
                        y: -40,
                        x: 40,
                        opacity: animatingPortal ? 0 : 1,
                      }}
                      animate={{
                        scale: 1,
                        y: 0,
                        x: 0,
                        opacity: 1,
                      }}
                      exit={{
                        scale: 0.4,
                        y: -40,
                        x: 40,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.25 }}
                    >
                      <ImageUploader
                        id="profile-upload"
                        className="w-32 h-32"
                        shape="full"
                        hasImage={!!user?.profilephoto}
                        onImageUpload={async (file: File) => {
                          setIsUploading(true);
                          try {
                            await useAuthStore
                              .getState()
                              .updateProfilePhoto(file);
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                        onImageDelete={async () => {
                          setIsUploading(true);
                          try {
                            await useAuthStore.getState().deleteProfilePhoto();
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                        disabled={isUploading}
                        defaultIcon={
                          <TbPencil className="text-white text-sm" />
                        }
                      >
                        <ProfileImage
                          size="large"
                          className="border-4 border-gray-100 group-hover/upload:border-gray/30 transition-all duration-200"
                        />
                      </ImageUploader>
                    </motion.div>
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {user?.name || 'User'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-1">
                      {user?.role || 'Staff'}
                    </p>
                    <p
                      className="text-xs text-gray-400 truncate max-w-[200px]"
                      title={user?.email || ''}
                    >
                      {user?.email || 'Email tidak tersedia'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              <div className="p-2">
                <button
                  onClick={() => setPortalOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150 group"
                >
                  <TbSettings className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                  <span>Pengaturan Profil</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 group"
                >
                  <TbLogout className="text-red-500 group-hover:text-red-600 transition-colors" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
