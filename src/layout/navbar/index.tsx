import { useNavigate } from 'react-router-dom';
import type { NavbarProps } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import { motion, AnimatePresence } from 'framer-motion';
import DateTimeDisplay from './live-datetime';
import Profile from '@/components/profile';

const Navbar = ({ sidebarCollapsed }: NavbarProps) => {
  const { user } = useAuthStore();
  const { onlineUsers } = usePresenceStore();

  // Ensure at least 1 user is shown when logged in
  const displayOnlineUsers = user ? Math.max(1, onlineUsers) : onlineUsers;
  const navigate = useNavigate();

  return (
    <nav className="bg-white px-6 py-3 sticky top-0 z-20">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center h-8">
          <h1 className="flex items-center" style={{ minHeight: '2em' }}>
            <span
              className="text-2xl font-semibold text-gray-800"
              style={{
                display: 'inline-block',
                verticalAlign: 'top',
                lineHeight: '2em',
                height: '2em',
              }}
            >
              Pharma
            </span>
            <AnimatePresence>
              {sidebarCollapsed ? (
                <motion.span
                  key="sys_collapsed"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-2xl font-semibold text-gray-800"
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    verticalAlign: 'top',
                    lineHeight: '2em',
                    height: '2em',
                  }}
                >
                  Sys
                </motion.span>
              ) : (
                <>
                  <motion.span
                    key="cy_part"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-2xl font-semibold text-gray-800"
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      verticalAlign: 'top',
                      lineHeight: '2em',
                      height: '2em',
                    }}
                  >
                    cy
                  </motion.span>
                </>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  key="management_system_part"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-2xl font-semibold text-gray-800"
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    verticalAlign: 'top',
                    lineHeight: '2em',
                    height: '2em',
                    marginLeft: '0.4rem',
                  }}
                >
                  Management System
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
              ←
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
              →
            </span>
          </button>
        </div>
        <div className="relative flex justify-end items-center space-x-3">
          <div
            className="flex items-center space-x-1.5 bg-primary/10 px-3 py-1.5 rounded-full text-sm text-primary transition-colors cursor-default ring-2 ring-primary/50"
            title={`${displayOnlineUsers} pengguna aktif`}
          >
            <span className="font-semibold">{displayOnlineUsers} Online</span>
          </div>

          <Profile />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
