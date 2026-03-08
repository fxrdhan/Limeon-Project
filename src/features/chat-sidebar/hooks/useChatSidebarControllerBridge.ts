import { useCallback, useRef } from 'react';

interface ViewportBridgeHandlers {
  closeMessageMenu: () => void;
  scheduleScrollMessagesToBottom: () => void;
}

export const useChatSidebarControllerBridge = () => {
  const closeMessageMenuRef = useRef<() => void>(() => {});
  const scheduleScrollToBottomRef = useRef<() => void>(() => {});

  const syncViewportBridge = useCallback(
    ({
      closeMessageMenu,
      scheduleScrollMessagesToBottom,
    }: ViewportBridgeHandlers) => {
      closeMessageMenuRef.current = closeMessageMenu;
      scheduleScrollToBottomRef.current = scheduleScrollMessagesToBottom;
    },
    []
  );

  const closeMessageMenu = useCallback(() => {
    closeMessageMenuRef.current();
  }, []);

  const scheduleScrollMessagesToBottom = useCallback(() => {
    scheduleScrollToBottomRef.current();
  }, []);

  return {
    closeMessageMenu,
    scheduleScrollMessagesToBottom,
    syncViewportBridge,
  };
};
