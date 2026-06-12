# Item Management Ownership Map

This feature owns the item master workflow and the unified master-data grid
shell used by item, supplier, customer, patient, and doctor tabs.

- Route mount: `src/app/routes/master-data/layout.tsx`
- Unified grid page: `pages/item-master`
- Item modal workflow: `presentation/templates/item`
- Generic entity modal workflow: `presentation/templates/entity`
- Feature public route constants: `public/masterDataNavigation.ts`
  re-exporting `shared/masterDataNavigation.ts`
- Feature testing facade: `public/testing.ts` for app-wide testing utilities
  that need controlled access to item-management internals.

## Runtime Layers

Use the narrowest layer that matches the change.

- `domain`: pure validation and business calculations with no React or
  Supabase dependency.
- `application/hooks/data`: item and master-data loading composition.
- `application/hooks/core`: save/delete orchestration and mutation adapters.
- `application/hooks/form`: form state, cache, modal orchestration, and user
  interactions.
- `application/hooks/utils`: package conversion and pricing calculations.
- `infrastructure`: Supabase, history, and storage adapters used by this
  feature.
- `presentation`: UI templates, organisms, molecules, and atoms.
- `shared`: feature types, contexts, navigation constants, and validation
  helpers.

## Change Guide

Start from the behavior owner, then move pure logic downward when it can be
tested outside React.

- Item form state or dirty/cache behavior: `application/hooks/form`
- Item save/update/delete behavior: `application/hooks/core`
- Pending package conversion payloads: `application/hooks/core/pendingPackageConversion.ts`
- Package conversion editing behavior before submit: `application/hooks/utils`
- Item fetch/hydration behavior: `application/hooks/data`
- Master-data tab routing from outside this feature:
  `public/masterDataNavigation.ts`
- Master-data tab routing implementation and internal config:
  `shared/masterDataNavigation.ts`
- App-wide item-management testing integration: `public/testing.ts`
- Modal layout and visible form sections: `presentation/templates`

## Boundary Rules

- Keep UI text, visual structure, focus behavior, and route behavior stable
  unless the product change explicitly requires a UX change.
- Do not add new business rules directly inside presentation components.
- Prefer pure helper modules for data-shaping and calculation code that can be
  unit tested without rendering React.
- Do not move reusable app-wide hooks or services into this feature unless the
  dependency is only used here.
- Keep cross-feature access behind `public/`; avoid broad root barrels that
  re-export feature internals. Deep presentation paths are acceptable only for
  established route-level lazy imports owned by this feature.
- Put cross-feature testing-only access behind `public/testing.ts` instead of
  importing from `application/`, `presentation/`, or `shared/` directly.
