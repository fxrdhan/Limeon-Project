export const MENU_GAP = 8;
export const MENU_WIDTH = 140;
export const MENU_HEIGHT = 128;
export const MAX_MESSAGE_CHARS = 220;
export const CHAT_SIDEBAR_TOASTER_ID = 'chat-sidebar-toaster';
export const MESSAGE_INPUT_MIN_HEIGHT = 22;
export const MESSAGE_INPUT_MAX_HEIGHT = 170;
export const COMPOSER_LAYOUT_SWITCH_DELAY = 55;
export const MAX_PENDING_COMPOSER_ATTACHMENTS = 5;
export const SEND_SUCCESS_GLOW_DURATION = 700;
export const SEND_SUCCESS_GLOW_RESET_BUFFER = 20;
export const MESSAGE_BOTTOM_GAP = 12;
export const EDITING_COMPOSER_OFFSET = 44;
export const COMPOSER_IMAGE_PREVIEW_OFFSET = 68;
export const COMPOSER_IMAGE_PREVIEW_EXIT_DURATION = 150;
export const EDIT_TARGET_FOCUS_PADDING = 12;
export const EDIT_TARGET_FLASH_PHASE_DURATION = 240;
export const CHAT_IMAGE_BUCKET = 'chat';
export const CHAT_IMAGE_FOLDER = 'images';
export const CHAT_AUDIO_FOLDER = 'audio';
export const CHAT_DOCUMENT_FOLDER = 'documents';
export const CHAT_CONVERSATION_CACHE_MAX_AGE_MS = 3 * 60 * 1000;
export const CHAT_CONVERSATION_CACHE_MAX_ENTRIES = 12;
export const CHAT_CONVERSATION_CACHE_MAX_MESSAGES = 200;
export const CHAT_CONVERSATION_PAGE_SIZE = 50;
export const PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES = 32;
export const COMPOSER_SYNC_LAYOUT_TRANSITION = {
  type: 'tween' as const,
  ease: [0.22, 1, 0.36, 1] as const,
  duration: 0.22,
};
export const COMPOSER_BASE_BORDER_COLOR = 'rgba(226, 232, 240, 0.65)';
export const COMPOSER_BASE_SHADOW = '0 2px 8px rgba(15, 23, 42, 0.08)';
export const COMPOSER_GLOW_SHADOW_PEAK =
  '0 0 18px oklch(50.8% 0.118 165.612 / 0.32),0 0 30px oklch(50.8% 0.118 165.612 / 0.18),0 2px 8px rgba(15, 23, 42, 0.08)';
export const COMPOSER_GLOW_SHADOW_HIGH =
  '0 0 16px oklch(50.8% 0.118 165.612 / 0.28),0 0 27px oklch(50.8% 0.118 165.612 / 0.16),0 2px 8px rgba(15, 23, 42, 0.08)';
export const COMPOSER_GLOW_SHADOW_MID =
  '0 0 14px oklch(50.8% 0.118 165.612 / 0.24),0 0 24px oklch(50.8% 0.118 165.612 / 0.14),0 2px 8px rgba(15, 23, 42, 0.08)';
export const COMPOSER_GLOW_SHADOW_FADE =
  '0 0 11px oklch(50.8% 0.118 165.612 / 0.18),0 0 19px oklch(50.8% 0.118 165.612 / 0.11),0 2px 8px rgba(15, 23, 42, 0.08)';
export const COMPOSER_GLOW_SHADOW_LOW =
  '0 0 8px oklch(50.8% 0.118 165.612 / 0.12),0 0 14px oklch(50.8% 0.118 165.612 / 0.08),0 2px 8px rgba(15, 23, 42, 0.08)';
