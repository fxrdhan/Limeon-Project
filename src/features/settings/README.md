# Settings Ownership Map

This feature owns application settings screens.

- Route mount: `src/app/routes/settings/index.tsx`
- Company profile screen: `profile/ProfilePage.tsx`
- Company profile orchestration: `profile/useProfilePage.ts`

## Runtime Layers

Use the narrowest owner for changes.

- `profile/ProfilePage.tsx`: route-level screen rendering and visible field
  layout.
- `profile/useProfilePage.ts`: company-profile query/mutation orchestration,
  edit-state transitions, and create-profile action.

## Data Boundaries

- Company-profile persistence goes through
  `src/services/api/companyProfile.service.ts`.
- Company-profile React Query keys come from `src/constants/queryKeys.ts`.

## Boundary Rules

- Keep settings route screens focused on rendering; move query/mutation
  orchestration into a sibling hook before adding more page state.
- Keep Supabase calls behind service modules.
- Preserve settings field labels, alerts, and route behavior unless a product
  change explicitly requires UX changes.
