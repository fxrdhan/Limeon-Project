import { useAuthStore } from '@/store/authStore';
import {
  buildChatHeaderModel,
  buildComposerPanelModel,
  buildMessagesPaneModel,
} from '../view-models';
import { computeDmChannelId } from '../utils/channel';
import type { ChatSidebarPanelProps } from '../types';
import { useChatSidebarRuntimeState } from './useChatSidebarRuntimeState';
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
    headerModel: buildChatHeaderModel(runtime),
    messagesModel: buildMessagesPaneModel(runtime, refs),
    composerModel: buildComposerPanelModel(runtime, refs),
    isAtTop: runtime.viewport.isAtTop,
    chatHeaderContainerRef: refs.chatHeaderContainerRef,
    handleChatPortalBackgroundClick:
      runtime.viewport.handleChatPortalBackgroundClick,
  };
};
