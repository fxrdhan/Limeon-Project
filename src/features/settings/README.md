# Settings Ownership Map

This feature owns application settings screens.

- Route mount: `src/app/routes/settings/index.tsx`
- Company profile screen: `pages/profile/ProfilePage.tsx`
- Company profile orchestration: `application/profile/useProfilePage.ts`
- Company profile edit-value helpers: `domain/profileEditValues.ts`
- Company profile service-call boundary:
  `infrastructure/companyProfileData.ts`

## Runtime Layers

Use the narrowest owner for changes.

- `pages`: route-level screen rendering and visible field layout.
- `application`: company-profile query/mutation orchestration, edit-state
  transitions, and create-profile action.
- `domain`: pure profile display and edit-value helpers with no React or data
  access dependency.
- `infrastructure`: company-profile service calls and default create-profile
  payload.

## Data Boundaries

- Company-profile persistence goes through
  `src/services/api/companyProfile.service.ts`.
- Company-profile React Query keys come from `src/constants/queryKeys.ts`.

## Boundary Rules

- Keep settings route screens focused on rendering; move query/mutation
  orchestration into `application` before adding more page state.
- Keep pure profile derivations in `domain`, not in route screens or
  infrastructure service wrappers.
- Keep Supabase calls behind service modules.
- Preserve settings field labels, alerts, and route behavior unless a product
  change explicitly requires UX changes.
