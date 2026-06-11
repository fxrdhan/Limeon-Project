export const loadChatSidebarPanel = () =>
  import('@/features/chat-sidebar/public/ChatSidebarPanel');

export const loadContactListPanel = () =>
  import('@/features/chat-sidebar/public/ContactListPanel');

export const preloadChatSidebarPanels = () => {
  void loadChatSidebarPanel();
  void loadContactListPanel();
};
