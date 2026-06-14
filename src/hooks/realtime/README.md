# Shared Realtime Hooks

This folder is reserved for realtime helpers that are shared across multiple
features.

- `useRealtimeChannelRecovery.ts`: generic recovery/backoff helper used by
  realtime feature modules.

Feature-owned realtime behavior belongs in the owning feature boundary. Item
master and supplier realtime sync are owned by `src/features/item-management`.
