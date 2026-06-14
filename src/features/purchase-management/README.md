# Purchase Management Ownership Map

This feature owns the purchase list page, manual purchase creation portal, and
invoice upload entry workflow.

- Route mount: `src/app/routes/purchases/index.tsx`
- Purchase list page: `pages/list/index.tsx`
- Purchase list orchestration: `application/list/usePurchaseListPage.ts`
- Purchase list service-call boundary:
  `infrastructure/purchaseListData.ts`
- Purchase list labels: `domain/purchaseListLabels.ts`
- Purchase list view model types: `domain/types.ts`
- Manual purchase modal: `components/AddPurchasePortal.tsx`
- Invoice upload modal: `components/UploadInvoicePortal.tsx`
- Invoice upload orchestration:
  `application/upload/useUploadInvoicePortal.ts`
- Invoice upload runtime cache:
  `application/upload/invoiceUploadStore.ts`
- Invoice upload utilities: `domain/uploadInvoiceUtils.ts`
- Invoice upload service-call boundary:
  `infrastructure/uploadInvoiceData.ts`
- Purchase item grid model:
  `components/purchase-form/usePurchaseItemsGrid.tsx`
- Purchase item grid input helpers:
  `components/purchase-form/purchaseItemsGridInput.ts`
- Purchase form state: `application/form/usePurchaseForm.ts`
- Purchase item-selection effects:
  `application/form/useItemSelectionEffect.ts`
- Purchase form service-call boundary:
  `infrastructure/purchaseFormData.ts`
- Purchase calculations: `domain/purchaseCalculations.ts`
- Purchase modal animation settings:
  `components/purchase-form/usePurchaseModalAnimation.ts`

## Runtime Layers

Use the current folders as ownership boundaries.

- `pages`: route-level page composition and visible screen wiring. Purchase
  list rendering lives in `pages/list/index.tsx`.
- `application`: purchase-list query/mutation orchestration, table state,
  pagination, modal visibility, purchase form state, item-selection side
  effects, invoice upload state, and invoice upload navigation.
- `domain`: pure purchase-list labels, template escaping, purchase
  calculations, invoice upload utilities, and view model types.
- `infrastructure`: purchase-list, purchase-form, and invoice-upload
  service-call wrappers.
- `components/purchase-form`: visible purchase form sections and field binding.
  Purchase item grid rows, columns, and cell renderers stay in
  `components/purchase-form/usePurchaseItemsGrid.tsx`.
  Pure grid input parsing belongs in
  `components/purchase-form/purchaseItemsGridInput.ts`.
  Modal animation settings stay in
  `components/purchase-form/usePurchaseModalAnimation.ts`.
- `components/upload-invoice`: invoice upload dialog, preview, validation UI,
  and upload actions.

## Data Boundaries

- Purchase persistence goes through `src/services/api/purchases.service.ts`.
- Invoice extraction goes through `src/services/invoiceExtractor.ts`.
- New item creation is delegated to
  `src/features/item-management/public/ItemModal.tsx`.
- Runtime invoice-file cache lives in
  `application/upload/invoiceUploadStore.ts` because the upload flow can span
  route transitions.

## Boundary Rules

- Do not import from item-management internals; use
  `src/features/item-management/public/ItemModal.tsx`.
- Keep Supabase calls out of components and hooks in this feature.
- Keep purchase math in `domain/purchaseCalculations.ts`, not in visible form
  sections.
- Keep `pages/list/index.tsx` focused on rendering the route-level screen;
  purchase-list query/mutation orchestration belongs in
  `application/list/usePurchaseListPage.ts`.
- Keep purchase-list, purchase-form, and invoice-upload service calls in
  `infrastructure`; application hooks should not import `src/services`
  directly.
