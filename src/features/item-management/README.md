# Item Management Ownership Map

This feature owns the item master workflow and the unified master-data grid
shell used by item, supplier, customer, patient, and doctor tabs.

- Route mount: `src/app/routes/master-data/layout.tsx`
- Unified grid page: `pages/item-master`
- Unified grid page orchestration: `pages/item-master/useItemMasterPage.ts`
- Unified grid page-state helpers: `pages/item-master/itemMasterPageState.ts`
- Unified grid render sections: `pages/item-master/components/ItemMaster*Section.tsx`
- Item modal workflow: `presentation/templates/item`
- Generic entity modal workflow: `presentation/templates/entity`
- Feature public route constants: `public/masterDataNavigation.ts`
  re-exporting `src/features/item-management/shared/masterDataNavigation.ts`
- Feature public item-selection hook: `public/useItemSelection.ts` for purchase
  and sales forms that need item lookup/dropdown state.
- Feature public item-data hooks: `public/useItemData.ts` for item lookup,
  item mutations, and item-master realtime sync.
- Feature public supplier-data hooks: `public/useSupplierData.ts` for purchase
  forms and item-master supplier tab state that need supplier lookup/mutations.
- Feature public identity-data hooks: `public/useIdentityData.ts` for sales
  forms and master-data tabs that need customer, patient, or doctor data.
- Feature public reference-data hooks: `public/useReferenceData.ts` for item
  category, type, package, unit, dosage, and manufacturer data.
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
- `infrastructure`: Supabase, history, storage, master-data service, and
  realtime adapters used by this feature.
- `presentation`: UI templates, organisms, molecules, and atoms.
- `shared`: feature types, contexts, navigation constants, and validation
  helpers.

## Change Guide

Start from the behavior owner, then move pure logic downward when it can be
tested outside React.

- Item form state or dirty/cache behavior: `application/hooks/form`
- Pure item form defaults and dirty comparison:
  `application/hooks/form/itemFormStateHelpers.ts`
- Item save/update/delete behavior: `application/hooks/core`
- Item detail/delete calls used by item save/delete flows:
  `infrastructure/itemCatalog.service.ts`
- Item image storage calls: `infrastructure/itemStorage.service.ts`
- Identity image storage calls:
  `infrastructure/identityImageStorage.service.ts`
- Item master-data/customer-level service calls:
  `infrastructure/itemMasterData.service.ts`
- Item-management realtime channels: `infrastructure/itemRealtime.service.ts`
- Item CRUD cache/submit data derivation:
  `application/hooks/core/itemCrudData.ts`
- Pending package conversion payloads: `application/hooks/core/pendingPackageConversion.ts`
- Package conversion editing behavior before submit: `application/hooks/utils`
- Package conversion form derivations:
  `presentation/organisms/item-package-conversion-form/helpers.ts`
- Item pricing baseline derivations:
  `presentation/organisms/item-pricing-form/baselineUtils.ts`
- Item fetch/hydration behavior: `application/hooks/data`
- Item-master route-level orchestration:
  `pages/item-master/useItemMasterPage.ts`
- Master-data tab routing from outside this feature:
  `public/masterDataNavigation.ts`
- Master-data tab routing implementation and internal config:
  `src/features/item-management/shared/masterDataNavigation.ts`
- Item lookup/dropdown state reused by transaction forms:
  `public/useItemSelection.ts`
- Item lookup, mutations, and realtime sync:
  `public/useItemData.ts`
- Supplier lookup, mutations, and realtime sync reused by transaction forms:
  `public/useSupplierData.ts`
- Customer, patient, and doctor lookup/mutations reused by sales forms:
  `public/useIdentityData.ts`
- Item reference-data lookup and mutations:
  `public/useReferenceData.ts`
- Item-master page flags, title, active entity fallback, and modal layer
  derivation: `pages/item-master/itemMasterPageState.ts`
- Supplier modal data normalization and mutation payload shaping:
  `pages/item-master/supplierModalData.ts`
- Item basic-info generated-code state derivation:
  `presentation/organisms/itemBasicInfoFormState.ts`
- Item settings keyboard-flow predicates:
  `presentation/organisms/itemSettingsFormState.ts`
- Reusable item form section focus helpers:
  `presentation/organisms/sectionFocus.ts`
- Item-master page toolbar/grid layout wrappers:
  `pages/item-master/components/ItemMaster*Section.tsx`
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
- Keep application, page, presentation, and shared modules behind feature
  infrastructure for service, storage, Supabase, and realtime access.
- Import application hooks from their concrete files; do not add
  `application/hooks/*/index.ts` barrels for internal convenience.
- Keep cross-feature access behind `public/`; avoid broad root barrels that
  re-export feature internals. Deep presentation paths are acceptable only for
  established route-level lazy imports owned by this feature.
- Put cross-feature testing-only access behind `public/testing.ts` instead of
  importing from `application/`, `presentation/`, or `shared/` directly.
