# Auth Ownership Map

This feature owns authentication route screens.

- Login route entry: `login/index.tsx`
- Auth state and side effects: `src/store/authStore.ts`
- Auth service boundary: `src/services/api/auth.service.ts`

## Runtime Layers

This feature is intentionally small.

- `login`: route-level login screen, visible form state, and submit wiring.
- `src/store/authStore.ts`: session state, login/logout orchestration, profile
  photo updates, and auth lifecycle integration.
- `src/store/authStoreServices.ts`: auth service loading, profile loading,
  realtime token sync, and logout cleanup bridges.

## Boundary Rules

- Keep login screen changes focused on visible form behavior.
- Keep Supabase auth calls behind `src/services/api/auth.service.ts`.
- Keep app-wide auth state in `src/store/authStore.ts`; do not add feature-local
  auth stores for the same session ownership.
- Preserve login labels, redirects, loading behavior, and error display unless a
  product change explicitly requires UX changes.
