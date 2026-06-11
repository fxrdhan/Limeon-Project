import type { ChatSidebarRuntimeState } from '../../hooks/useChatSidebarRuntimeState';

export type ComposerPanelRuntime = Pick<
  ChatSidebarRuntimeState,
  'composer' | 'previews' | 'mutations' | 'refs' | 'viewport'
>;

export interface ComposerAttachmentScrollState {
  hasOverflow: boolean;
  isAtTop: boolean;
  isAtBottom: boolean;
}
