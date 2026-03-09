import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { chatSidebarGateway } from '../data/chatSidebarGateway';
import { useChatIncomingDeliveries } from './useChatIncomingDeliveries';

export const useChatRuntime = () => {
  const { user } = useAuthStore();

  useChatIncomingDeliveries();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void chatSidebarGateway.retryChatCleanupFailures();
  }, [user?.id]);
};
