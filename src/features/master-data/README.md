# Master Data Ownership Note

This folder is currently an inactive legacy shell. The active unified
master-data workflow is owned by `src/features/item-management`.

- Active route mount: `src/app/routes/master-data/layout.tsx`
- Active unified grid page: `src/features/item-management/pages/item-master`
- Active navigation constants:
  `src/features/item-management/public/masterDataNavigation.ts`

## Boundary Rules

- Do not add new master-data workflows here unless the product explicitly
  revives this feature boundary.
- New supplier, customer, patient, doctor, and item master behavior should start
  in `src/features/item-management`.
- Cross-feature consumers should use item-management public APIs instead of
  reaching into item-management internals.
- If this folder is revived, add a fresh ownership map before adding runtime
  code.
