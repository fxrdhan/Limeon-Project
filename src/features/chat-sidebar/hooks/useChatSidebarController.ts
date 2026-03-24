import { useAuthStore } from '@/store/authStore';
import type { ChatSidebarPanelProps } from '../types';
import { computeDmChannelId } from '../utils/channel';
import { useChatHeaderModel } from './useChatHeaderModel';
import { useChatSidebarRuntimeState } from './useChatSidebarRuntimeState';
import { useComposerPanelModel } from './useComposerPanelModel';
import { useMessagesPaneModel } from './useMessagesPaneModel';
import { useChatSidebarRefs } from './useChatSidebarRefs';
import { useTargetProfilePhoto } from './useTargetProfilePhoto';

export const useChatSidebarController = ({
  isOpen,
  onClose,
  targetUser,
}: ChatSidebarPanelProps) => {
  const { user } = useAuthStore();
  const refs = useChatSidebarRefs();
  /* c8 ignore next */
  const currentChannelId =
    user && targetUser ? computeDmChannelId(user.id, targetUser.id) : null;

  const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
  const runtime = useChatSidebarRuntimeState({
    isOpen,
    onClose,
    targetUser,
    user,
    currentChannelId,
    refs,
    displayTargetPhotoUrl,
  });

  return {
    headerModel: useChatHeaderModel(runtime),
    messagesModel: useMessagesPaneModel(runtime, refs),
    composerModel: useComposerPanelModel(runtime, refs),
    isAtTop: runtime.viewport.isAtTop,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    handleChatPortalBackgroundClick:
      runtime.viewport.handleChatPortalBackgroundClick,
  };
};
