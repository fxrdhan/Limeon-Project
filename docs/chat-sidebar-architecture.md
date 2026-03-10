# Chat Sidebar Architecture (Current Implementation)

Dokumen ini mendeskripsikan implementasi chat sidebar yang aktif di repo saat ini.
Isi dokumen ini bersifat deskriptif, bukan target refactor.

## 1) Scope

- UI host:
  - `src/app/layout/main/index.tsx`
  - `src/app/layout/chat-sidebar/index.tsx`
  - `src/app/layout/navbar/index.tsx`
- Global UI state:
  - `src/store/chatSidebarStore.ts`
  - `src/store/pageFocusBlockStore.ts`
- Feature:
  - `src/features/chat-sidebar/*`
  - `src/features/chat-sidebar/hooks/useChatIncomingDeliveries.ts`
- Data access:
  - `src/features/chat-sidebar/data/chatSidebarGateway.ts`
  - `src/services/api/chat.service.ts`
  - `src/services/api/storage.service.ts`
  - `src/services/realtime/realtime.service.ts`
- Database objects verified from Supabase:
  - `public.chat_messages`
  - `public.user_presence`
  - RPC:
    - `mark_chat_messages_as_read`
    - `mark_chat_messages_as_delivered`
    - `mark_chat_message_ids_as_read`
    - `mark_chat_message_ids_as_delivered`
    - `delete_chat_message_thread`

## 2) Entry Points

### 2.1 Open Flow

- `Navbar` mengambil roster online dari `usePresenceRoster()`.
- Klik user di portal navbar memanggil `useChatSidebarStore().toggleChatForUser(targetUser)`.
- `MainLayout` membaca `isOpen`, `targetUser`, dan `closeChat` dari `chatSidebarStore`.
- `MainLayout` merender `ChatSidebar` di sisi kanan layout.
- `ChatSidebar` menyimpan `persistedTargetUser` agar panel tetap punya target user selama animasi close.
- `ChatSidebar` merender `ChatSidebarPanel` (`src/features/chat-sidebar/index.tsx`) saat:
  - sidebar open, atau
  - sidebar sedang close animation tetapi target user masih dipersist.

### 2.2 Close Flow

- `ChatHeader` memanggil `onClose`.
- `useChatSidebarController` langsung memanggil `chatSidebarStore.closeChat()`.
- `MainLayout` meng-set `pageFocusBlockStore.isBlocked` mengikuti status open chat sidebar.

## 3) Global State Ownership

### 3.1 `chatSidebarStore`

File: `src/store/chatSidebarStore.ts`

State yang disimpan:

- `isOpen: boolean`
- `targetUser?: ChatTargetUser`

Actions:

- `openChat(targetUser)`
- `closeChat()`
- `toggleChatForUser(targetUser)`

Store ini tidak menyimpan message list, presence, receipt, atau attachment state.

### 3.2 `pageFocusBlockStore`

File: `src/store/pageFocusBlockStore.ts`

Dipakai oleh `MainLayout` untuk memblok focus behavior halaman saat chat sidebar open.

### 3.3 `presenceStore`

File: `src/store/presenceStore.ts`

Store ini bukan bagian internal chat sidebar, tetapi dipakai `Navbar` untuk:

- jumlah user online
- list user online
- channel subscription roster presence

## 4) Feature Composition Root

File: `src/features/chat-sidebar/index.tsx`

`ChatSidebarPanel` hanya merender:

- `ChatHeader`
- `MessagesPane`
- `ComposerPanel`
- `Toaster`

Seluruh orkestrasi runtime dibangun di `useChatSidebarController()`.

## 5) Hook Responsibilities

### 5.1 `useChatSidebarController`

File: `src/features/chat-sidebar/hooks/useChatSidebarController.ts`

Tanggung jawab:

- membuat ref DOM utama
- membuat `currentChannelId` dari dua user dengan `generateChannelId()`
- compose hook:
  - `useTargetProfilePhoto`
  - `useChatSession`
  - `useChatComposer`
  - `useChatInteractionModes`
  - `useChatViewport`
  - `useChatBulkDelete`
- membentuk prop object untuk:
  - `ChatHeader`
  - `MessagesPane`
  - `ComposerPanel`

Hook ini tidak menyimpan global store sendiri selain state lokal `expandedMessageIds`.

### 5.2 `useChatSession`

File: `src/features/chat-sidebar/hooks/useChatSession.ts`

Tanggung jawab:

- state `messages`
- state `loading`
- fetch percakapan awal via `chatSidebarGateway.fetchConversationMessages()`
- mapping display name via `mapConversationMessagesForDisplay()`
- optimistic-message reconciliation terhadap message `temp_*`
- subscription realtime conversation channel `chat_<channelId>`
- write-through cache percakapan di shared feature cache
- expose callback:
  - `broadcastNewMessage`
  - `broadcastUpdatedMessage`
  - `broadcastDeletedMessage`
  - `markMessageIdsAsRead`

Cache percakapan disimpan di shared module cache:

- `sharedConversationCache: Map<string, ConversationCacheEntry>`

Cache ini hidup lintas mount panel, tetap dibatasi TTL dan max entries.

### 5.3 `useChatSessionPresence`

File: `src/features/chat-sidebar/hooks/useChatSessionPresence.ts`

Tanggung jawab:

- state `targetUserPresence`
- hydrate awal target user presence saat chat dibuka
- subscribe perubahan target user presence via channel `user_presence_changes`

### 5.4 `useChatIncomingDeliveries`

File: `src/features/chat-sidebar/hooks/useChatIncomingDeliveries.ts`

Tanggung jawab:

- subscribe incoming inserts untuk delivery receipt via channel `incoming_messages_<userId>`
- berjalan di level `MainLayout`, tidak bergantung pada chat sidebar sedang open
- mark incoming message sebagai delivered via RPC per-ID

### 5.5 `useChatSessionReceipts`

File: `src/features/chat-sidebar/hooks/useChatSessionReceipts.ts`

Tanggung jawab:

- merge update receipt ke `messages`
- dedup concurrent delivery/read update by message id
- memanggil RPC:
  - `mark_chat_message_ids_as_delivered`
  - `mark_chat_message_ids_as_read`

### 5.6 `useChatComposer`

File: `src/features/chat-sidebar/hooks/useChatComposer.ts`

Tanggung jawab:

- state text composer
- state edit mode
- auto-resize textarea
- inline vs multiline layout mode
- send-success glow
- contextual offset untuk composer banner / attachment preview
- compose:
  - `useChatComposerAttachments`
  - `useChatComposerActions`

### 5.7 `useChatComposerAttachments`

File: `src/features/chat-sidebar/hooks/useChatComposerAttachments.ts`

Tanggung jawab:

- state attach modal
- state `pendingComposerAttachments`
- image preview composer
- replace existing attachment
- render preview cover PDF untuk attachment lokal
- cleanup object URL untuk attachment preview

Attachment limit:

- maksimum `5` attachment per send (`MAX_PENDING_COMPOSER_ATTACHMENTS`)

### 5.8 `useChatComposerActions`

File: `src/features/chat-sidebar/hooks/useChatComposerActions.ts`

Tanggung jawab:

- edit text message
- delete thread message + caption
- copy message/image via hook transfer terpisah
- download file via hook transfer terpisah
- delegasi send ke `useChatComposerSend`

Delete path untuk persisted message:

- memanggil RPC `delete_chat_message_thread`
- membroadcast semua ID yang dikembalikan RPC

### 5.9 `useChatComposerSend`

File: `src/features/chat-sidebar/hooks/useChatComposerSend.ts`

Tanggung jawab:

- optimistic send untuk:
  - text
  - image
  - file
- upload file/image ke storage bucket
- create message row di `chat_messages`
- generate dan upload preview PNG untuk PDF
- create caption text message untuk attachment bila ada caption

Temp id pattern yang dipakai:

- text: `temp_<timestamp>`
- image: `temp_image_<timestamp>`
- file: `temp_file_<timestamp>`
- caption attachment: `temp_caption_<timestamp>`

### 5.10 `useChatInteractionModes`

File: `src/features/chat-sidebar/hooks/useChatInteractionModes.ts`

Tanggung jawab:

- message search mode
- selection mode
- active search result index / navigation
- serialize selected messages untuk clipboard
- menjaga caption row agar tidak dianggap message utama untuk search/selection

### 5.11 `useChatViewport`

File: `src/features/chat-sidebar/hooks/useChatViewport.ts`

Tanggung jawab:

- tracking `isAtBottom`, `isAtTop`, `hasNewMessages`
- scroll ke bawah
- ukur tinggi composer container
- mark visible unread message sebagai read
- compose:
  - `useComposerContainerHeight`
  - `useChatViewportReadReceipts`
  - `useChatViewportMenu`
  - `useChatViewportFocus`

### 5.12 `useChatViewportMenu`

File: `src/features/chat-sidebar/hooks/useChatViewportMenu.ts`

Tanggung jawab:

- open/close message action menu
- hitung placement `left/right/up/down`
- hitung `MenuSideAnchor`
- menjaga menu tetap visible di viewport chat

### 5.13 `useChatViewportFocus`

File: `src/features/chat-sidebar/hooks/useChatViewportFocus.ts`

Tanggung jawab:

- scroll-to-message untuk hasil search
- scroll-to-message untuk target edit
- flash highlight pada message target

### 5.14 `useMessagePdfPreviews`

File: `src/features/chat-sidebar/hooks/useMessagePdfPreviews.ts`

Tanggung jawab:

- generate fallback preview PDF untuk message file yang belum punya `file_preview_url`
- trigger backfill persistence untuk preview PDF milik sender saat metadata belum lengkap
- cache preview di memory
- retry render hingga 3 kali

## 6) Component Responsibilities

### 6.1 `ChatHeader`

File: `src/features/chat-sidebar/components/ChatHeader.tsx`

Fungsi:

- tampilkan target user
- tampilkan status online / last seen
- search UI
- selection mode UI
- options menu
- close sidebar button

Status online dianggap fresh bila:

- `targetUserPresence.is_online === true`, dan
- `last_seen` tidak lebih tua dari `90_000 ms`

### 6.2 `MessagesPane`

File: `src/features/chat-sidebar/components/MessagesPane.tsx`

Fungsi:

- render list message
- render image preview portal
- render document preview portal
- render tombol scroll-to-bottom
- meminta preview PDF message dari `useMessagePdfPreviews`

### 6.3 `ComposerPanel`

File: `src/features/chat-sidebar/components/ComposerPanel.tsx`

Fungsi:

- render textarea
- render attach button
- render attach modal
- render attachment preview list
- render edit banner
- render preview image / dokumen composer

### 6.4 `MessageItem`

Files:

- `src/features/chat-sidebar/components/messages/MessageItem.tsx`
- `src/features/chat-sidebar/components/messages/MessageBubbleContent.tsx`
- `src/features/chat-sidebar/components/messages/MessageBubbleMeta.tsx`
- `src/features/chat-sidebar/components/messages/MessageActionPopover.tsx`

Fungsi:

- turunan status message:
  - `sending`
  - `sent`
  - `delivered`
  - `read`
- render text/image/file/PDF bubble
- render action menu
- render search highlight
- render flash highlight

## 7) Data Access Layer

### 7.1 Gateway

File: `src/features/chat-sidebar/data/chatSidebarGateway.ts`

Gateway ini membungkus:

- `chatService`
- `StorageService`
- `realtimeService`

Method yang diekspos gateway saat ini:

- `fetchConversationMessages`
- `createMessage`
- `updateMessage`
- `deleteMessage`
- `deleteMessageThread`
- `markMessageIdsAsDelivered`
- `markMessageIdsAsRead`
- `getUserPresence`
- `createRealtimeChannel`
- `removeRealtimeChannel`
- `uploadImage`
- `uploadAttachment`

### 7.2 Services

#### `chatService`

File: `src/services/api/chat.service.ts`

Method:

- `fetchMessagesBetweenUsers(userId, targetUserId, channelId?)`
- `insertMessage(payload)`
- `updateMessage(id, payload)`
- `markMessagesAsRead(senderId, receiverId, channelId?)`
- `markMessagesAsDelivered(senderId, receiverId, channelId?)`
- `markMessageIdsAsDelivered(messageIds)`
- `markMessageIdsAsRead(messageIds)`
- `deleteMessage(id)`
- `deleteMessageThread(id)`
- `getUserPresence(userId)`

#### `StorageService`

File: `src/services/api/storage.service.ts`

Method yang dipakai chat sidebar:

- `uploadFile()` untuk image
- `uploadRawFile()` untuk document/audio/PDF preview PNG

#### `realtimeService`

File: `src/services/realtime/realtime.service.ts`

Method:

- `createChannel(name, options?)`
- `removeChannel(channel)`

## 8) Storage Contract

Konstanta storage:

- bucket: `chat`
- image folder: `images`
- audio folder: `audio`
- document folder: `documents`

Path builder:

- image: `images/<safeChannelId>/<senderId>_<timestamp>.<ext>`
- file:
  - `audio/<safeChannelId>/<senderId>_<timestamp>.<ext>`
  - `documents/<safeChannelId>/<senderId>_<timestamp>.<ext>`

PDF preview path:

- dari `documents/...` diubah menjadi `previews/...`
- extension diganti `.png`

Current storage fallback:

- `src/features/chat-sidebar/utils/message-file.ts` memakai gateway feature untuk fetch PDF blob
  dari storage bila `fetch(url)` gagal.

## 9) Database Contract (Verified)

### 9.1 `public.chat_messages`

Kolom yang tersedia:

- `id uuid primary key`
- `sender_id uuid not null`
- `receiver_id uuid nullable`
- `channel_id text nullable`
- `message text not null`
- `message_type varchar default 'text'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `is_read boolean default false`
- `reply_to_id uuid nullable`
- `file_name text nullable`
- `file_kind varchar nullable`
- `file_mime_type text nullable`
- `file_size bigint nullable`
- `file_storage_path text nullable`
- `file_preview_url text nullable`
- `file_preview_page_count integer nullable`
- `file_preview_status varchar nullable`
- `file_preview_error text nullable`
- `is_delivered boolean default false`

Foreign key:

- `sender_id -> public.users.id`
- `receiver_id -> public.users.id`
- `reply_to_id -> public.chat_messages.id`

### 9.2 `public.user_presence`

Kolom yang tersedia:

- `id uuid primary key`
- `user_id uuid unique`
- `is_online boolean default false`
- `last_seen timestamptz default now()`
- `last_chat_opened timestamptz nullable` (saat ini tidak dipakai runtime chat sidebar)
- `updated_at timestamptz default now()`

Foreign key:

- `user_id -> public.users.id`

### 9.3 Active RLS Policies

#### `chat_messages`

- `SELECT`: user dapat melihat row bila `sender_id = auth.uid()` atau `receiver_id = auth.uid()`
- `INSERT`: user dapat insert row bila `sender_id = auth.uid()`
- `UPDATE`: user dapat update row bila `sender_id = auth.uid()`
- `DELETE`: user dapat delete row bila `sender_id = auth.uid()`

#### `user_presence`

- `SELECT`: role authenticated dapat melihat semua row presence
- `INSERT`: user hanya bisa insert row miliknya sendiri
- `UPDATE`: user hanya bisa update row miliknya sendiri
- `DELETE`: user hanya bisa delete row miliknya sendiri

### 9.4 Active RPC Functions

#### `mark_chat_messages_as_read(p_sender_id uuid, p_receiver_id uuid, p_channel_id text default null)`

- `SECURITY DEFINER`
- hanya boleh dijalankan saat `auth.uid() = p_receiver_id`
- update:
  - `is_read = true`
  - `is_delivered = true`
- return row `chat_messages` yang terupdate

#### `mark_chat_messages_as_delivered(p_sender_id uuid, p_receiver_id uuid, p_channel_id text default null)`

- `SECURITY DEFINER`
- hanya boleh dijalankan saat `auth.uid() = p_receiver_id`
- update:
  - `is_delivered = true`
- return row `chat_messages` yang terupdate

#### `mark_chat_message_ids_as_read(p_message_ids uuid[])`

- `SECURITY DEFINER`
- hanya update row yang `receiver_id = auth.uid()`
- update:
  - `is_read = true`
  - `is_delivered = true`
- return row `chat_messages` yang terupdate

#### `mark_chat_message_ids_as_delivered(p_message_ids uuid[])`

- `SECURITY DEFINER`
- hanya update row yang `receiver_id = auth.uid()`
- update:
  - `is_delivered = true`
- return row `chat_messages` yang terupdate

#### `delete_chat_message_thread(p_message_id uuid)`

- function SQL
- hanya menghapus parent message bila `sender_id = auth.uid()`
- juga menghapus caption text message yang:
  - `reply_to_id = parent_message.id`
  - `message_type = 'text'`
  - `sender_id`, `receiver_id`, dan `channel_id` sama dengan parent
- return array UUID message yang terhapus

## 10) Realtime Channels Used

### App-level presence

Runtime:

- `usePresence()` menulis heartbeat ke `public.user_presence`
- `usePresence()` subscribe channel `user_presence_roster_changes`
  untuk refresh roster online di navbar

### Chat sidebar channels

- `chat_<channelId>`
  - postgres insert/update `chat_messages` by `channel_id`
- `user_presence_changes`
  - postgres `user_presence` change untuk target user aktif
- `incoming_messages_<userId>`
  - postgres insert `chat_messages` by `receiver_id`
  - disubscribe app-level lewat `useChatIncomingDeliveries`

## 11) Message and Attachment Flow

### 11.1 Initial load

1. `useChatSession` fetch row percakapan dari `chat_messages`.
2. Row dimap ke display form (`sender_name`, `receiver_name`).
3. Message incoming yang belum delivered ditandai delivered via RPC per-ID.

### 11.2 Text send

1. Buat optimistic row `temp_*`.
2. Insert row text ke `chat_messages`.
3. Replace optimistic row dengan row persisted.
4. Broadcast `new_message`.

### 11.3 Image send

1. Buat object URL lokal untuk preview.
2. Buat optimistic image message.
3. Upload file ke storage bucket `chat`.
4. Insert row `message_type = 'image'`.
5. Jika ada caption, insert text row kedua dengan `reply_to_id = image_message.id`.

### 11.4 File send

1. Buat object URL lokal untuk preview.
2. Buat optimistic file message.
3. Upload file ke storage bucket `chat`.
4. Insert row `message_type = 'file'`.
5. Jika file PDF:
   - jadwalkan background sync preview PNG
   - upload PNG preview ke storage
   - update row `file_preview_*`
6. Jika ada caption, insert text row kedua dengan `reply_to_id = file_message.id`.

### 11.5 Delete

- UI menghapus optimistic thread dari state lokal lebih dulu.
- Untuk persisted thread, feature memanggil RPC `delete_chat_message_thread`.
- Semua ID hasil RPC dibroadcast lewat `delete_message`.

### 11.6 Read receipt

- `useChatViewport` menghitung bubble incoming yang terlihat di viewport.
- Bubble incoming yang visible dan unread dikirim ke RPC `mark_chat_message_ids_as_read`.

## 12) Search and Selection Rules

Rules yang dipakai feature:

- caption attachment adalah text row biasa yang `reply_to_id` mengarah ke image/file parent
- caption row:
  - tidak ditampilkan sebagai bubble terpisah
  - tidak masuk selectable set
  - tidak jadi hasil search terpisah
- search attachment dilakukan terhadap:
  - body text message, atau
  - caption attachment parent

Implementasi:

- `src/features/chat-sidebar/utils/message-derivations.ts`

## 13) Current Test Footprint

Test file yang ada saat ini:

- `ChatHeader.test.tsx`
- `ChatSidebarPanel.test.tsx`
- `message-derivations.test.ts`
- `pdf-message-preview-cache.test.ts`
- `pdf-preview.test.ts`
- `useChatComposer.test.tsx`
- `useChatComposerActions.test.tsx`
- `useChatInteractionModes.test.tsx`
- `useChatSession.test.tsx`

Area yang sudah dicakup:

- header presence freshness
- panel wiring
- caption/search/selection derivation
- PDF preview cache
- PDF renderer wrapper
- composer reset on channel switch
- composer action failure recovery
- interaction mode state
- session stale fetch + realtime fallback

## 14) Current-State Notes

- Dokumen ini mencatat current state walaupun ada bagian implementasi yang belum sepenuhnya mengikuti `docs/data-access-policy.md`.
- Implementasi saat ini tidak memakai React Query untuk data chat sidebar;
  realtime session, optimistic send, dan receipt/presence sync tetap
  diorkestrasi langsung di feature hooks.
- Conversation cache chat sidebar sekarang shared di level feature module, bukan lagi ref lokal per instance `useChatSession`.
- Delivery receipt incoming sekarang hidup di level layout aplikasi, tidak bergantung pada panel chat open.
- Fallback PDF storage sekarang lewat data access layer, bukan import Supabase langsung dari util feature.
- `ChatSidebar` wrapper memakai width responsif berdasarkan viewport, dengan target desktop `420px`.
