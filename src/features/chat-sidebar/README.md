# Chat Sidebar Ownership Map

This feature is mounted once from the main shell and opened from the navbar.

- Shell mount: `src/app/layout/main/index.tsx`
- Launcher entry: `src/app/layout/navbar/index.tsx`
- Global open/target state only: `src/store/chatSidebarStore.ts`

## Runtime Layers

Keep the global store small. All conversation runtime lives inside the feature.

- `hooks/useChatSidebarHost.ts`: boots chat runtime and syncs page-focus blocking with open state.
- `index.tsx`: creates shared refs, resolves the DM channel id, loads the target photo, and passes focused runtime slices into each pane.
- `hooks/useChatSidebarRuntimeState.ts`: top-level runtime composition for session, interaction modes, UI state, and mutations.
- `hooks/useChatSession.ts`: owns conversation data, initial load, pagination, realtime recovery, presence, receipts, and cache sync.
- `hooks/useChatInteractionModes.ts`: owns search, selection, copy, and per-message interaction state.
- `hooks/useChatSidebarUiState.ts`: owns composer state, viewport/menu behavior, and preview portals.
- `hooks/useChatConversationMutations.ts`: owns send, edit, delete, download, and forward mutations.

## Change Guide

Start from the layer that matches the behavior you want to change.

- Conversation loading or realtime sync: `hooks/useChatSession.ts`, `hooks/useChatConversationInitialLoad.ts`, `hooks/useChatConversationRealtime.ts`
- Search and selection behavior: `hooks/useChatInteractionModes.ts`
- Composer attachments, paste handling, and local previews: `hooks/useChatComposer.ts`, `hooks/useChatSidebarPreviewState.ts`
- Message actions such as send/edit/delete/forward: `hooks/useChatConversationMutations.ts`

## State Ownership

Follow this map before adding new chat state.

- Shell-wide open/target state: `src/store/chatSidebarStore.ts`
- Conversation and presence state from Supabase: `hooks/useChatSession.ts`
- Search, selection, and per-message interaction state: `hooks/useChatInteractionModes.ts`
- Composer text, edit mode, attach modal, and local attachment queues: `hooks/useChatComposer.ts`, `hooks/useChatComposerAttachments.ts`
- Viewport scroll pinning, jump/highlight state, and message menu placement: `hooks/useChatViewport.ts`
- Image/document preview portals and composer attachment action menus: `hooks/useChatSidebarPreviewState.ts`

Persistence layers:

- In-memory cache only: `utils/chatRuntimeCache.ts`
- `localStorage`: `utils/chatRuntimeState.ts`, composer draft messages in `utils/composer-draft-persistence.ts`
- IndexedDB: composer draft attachments in `utils/composer-draft-persistence.ts`, channel image asset cache in `utils/channel-image-asset-cache.ts`

## Data Boundaries

Frontend code should not query chat tables directly from components or hooks.

- Feature gateway: `data/chatSidebarGateway.ts`
- RPC services: `src/services/api/chat/messages.service.ts`, `src/services/api/chat/presence.service.ts`, `src/services/api/chat/directory.service.ts`
- Edge Function services: `src/services/api/chat/cleanup.service.ts`, `src/services/api/chat/link.service.ts`, `src/services/api/chat/forward.service.ts`, `src/services/api/chat/pdf-compress.service.ts`, `src/services/api/chat/remote-asset.service.ts`
- Shared request/response contracts: `shared/chatFunctionContracts.ts`
- Edge Function source: `supabase/functions/chat-cleanup`, `supabase/functions/chat-link`, `supabase/functions/chat-forward-message`, `supabase/functions/chat-pdf-compress`, `supabase/functions/chat-remote-asset`

## Shared-Link Contract

Shared links are attachment-only. `public.chat_shared_links.storage_path` is required and `target_url` is no longer part of the supported contract.

- Local schema/type check: `bun run check:chat-schema`
- Live deployment check: `CHAT_SCHEMA_LIVE_DATABASE_URL=... bun run check:chat-schema:live`
