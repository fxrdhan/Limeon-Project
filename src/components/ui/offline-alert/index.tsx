import { useEffect, useState } from 'react';
import { FaWifi } from 'react-icons/fa';

const OfflineAlert = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [justCameOnline, setJustCameOnline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setJustCameOnline(true);
            // Auto-dismiss the online notification after 3 seconds
            setTimeout(() => setJustCameOnline(false), 3000);
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline && !justCameOnline) return null;

    return (
        <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${
                isOffline 
                    ? "bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" 
                    : "bg-gradient-to-r from-green-500 to-teal-500"
            } text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3`}
            role="alert"
        >
            <FaWifi className="text-xl" />
            <span className="font-medium">
                {isOffline 
                    ? "Koneksi terputus. Anda sedang offline. Beberapa fitur mungkin tidak berfungsi."
                    : "Koneksi tersambung kembali. Anda sedang online."}
            </span>
        </div>
    );
};

export default OfflineAlert;
