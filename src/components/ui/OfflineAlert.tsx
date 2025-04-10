import { useEffect, useState } from 'react';

const OfflineAlert = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div style={{ backgroundColor: 'red', color: 'white', padding: '10px', textAlign: 'center' }}>
            You are offline. Some features may not be available.
        </div>
    );
};

export default OfflineAlert;
