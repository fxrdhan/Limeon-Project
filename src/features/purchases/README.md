# Purchases Ownership Map

This feature owns purchase document and invoice-facing screens that are separate
from the editable purchase-management workflow.

- Confirm extracted invoice route: `confirm-invoice/index.tsx`
- Confirm extracted invoice orchestration:
  `confirm-invoice/useConfirmInvoicePage.ts`
- Confirm extracted invoice service-call boundary:
  `confirm-invoice/confirmInvoiceData.ts`
- Confirm extracted invoice display helpers:
  `confirm-invoice/confirmInvoiceDisplay.ts`
- Invoice layout: `invoice-layout/index.tsx`
- Purchase document helpers: `purchaseDocument.ts`
- Print purchase: `print-purchase/index.tsx`
- Print purchase orchestration: `print-purchase/usePrintPurchasePage.ts`
- View purchase route: `view-purchase/index.tsx`
- View purchase orchestration: `view-purchase/useViewPurchasePage.ts`
- View purchase service-call boundary: `view-purchase/viewPurchaseData.ts`

## Runtime Layers

This area is intentionally route-screen oriented today.

- `confirm-invoice`: review and confirmation flow after invoice extraction;
  route state, regeneration, save, and navigation side effects stay in
  `useConfirmInvoicePage`; invoice extractor calls stay in
  `confirmInvoiceData`, while grid row/formatting helpers stay in
  `confirmInvoiceDisplay`.
- `invoice-layout`: printable invoice composition shared by purchase document
  screens.
- `purchaseDocument.ts`: pure helpers for purchase-document currency formatting,
  subtotal calculation, item-table display fallbacks, payment display labels,
  and print-session key ownership.
- `print-purchase`: print-focused route output; session reads and auto-print
  timing stay in `usePrintPurchasePage`.
- `view-purchase`: read-only purchase detail route; navigation, zoom state,
  and print-session persistence stay in `useViewPurchasePage`; service calls
  stay in `viewPurchaseData`.

## Data Boundaries

- Purchase data should come from `src/services/api/purchases.service.ts` or
  explicit route loader/service boundaries.
- Shared invoice/purchase types should come from `src/types/purchase.ts` or the
  app-wide `src/types` barrel.
- Editable purchase form behavior belongs in `src/features/purchase-management`,
  not here.

## Boundary Rules

- Keep this feature focused on review, view, and print workflows.
- Do not place purchase creation or mutation orchestration in this folder.
- Keep print layout logic deterministic and easy to render without external UI
  state.
- Keep purchase-document calculations local to this feature; do not import
  editable purchase-form calculation helpers from `purchase-management`.
