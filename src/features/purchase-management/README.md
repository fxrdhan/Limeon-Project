# Purchase Management Ownership Map

This feature owns the purchase list page, manual purchase creation portal, and
invoice upload entry workflow.

- Route mount: `src/app/routes/purchases/index.tsx`
- Purchase list page: `pages/PurchaseListPage.tsx`
- Manual purchase modal: `components/AddPurchasePortal.tsx`
- Invoice upload modal: `components/UploadInvoicePortal.tsx`
- Purchase form state: `hooks/purchaseForm.ts`
- Purchase calculations: `hooks/calc.ts`

## Runtime Layers

Use the current folders as ownership boundaries until this feature needs a full
`domain/application/infrastructure/presentation` split.

- `pages`: route-level page composition, table state, pagination, and modal
  visibility.
- `components/purchase-form`: visible purchase form sections and field binding.
- `components/upload-invoice`: invoice upload dialog, preview, validation UI,
  and upload actions.
- `hooks`: purchase form state, item-selection effects, VAT editor state, and
  modal animation settings.

## Data Boundaries

- Purchase persistence goes through `src/services/api/purchases.service.ts`.
- Invoice extraction goes through `src/services/invoiceExtractor.ts`.
- New item creation is delegated to `src/features/item-management/public/ItemModal`.
- Runtime invoice-file cache lives in `src/store/invoiceUploadStore.ts` because
  the upload flow can span route transitions.

## Boundary Rules

- Do not import from item-management internals; use `public/ItemModal`.
- Keep Supabase calls out of components and hooks in this feature.
- Keep purchase math in `hooks/calc.ts` or a future pure domain helper, not in
  visible form sections.
- If purchase list behavior grows, move query/mutation orchestration out of
  `pages/PurchaseListPage.tsx` before adding more table state there.
