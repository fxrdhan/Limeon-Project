# Purchases Ownership Map

This feature owns purchase document and invoice-facing screens that are separate
from the editable purchase-management workflow.

- Confirm extracted invoice route: `pages/confirm-invoice/index.tsx`
- Confirm extracted invoice orchestration:
  `application/confirm-invoice/useConfirmInvoicePage.ts`
- Confirm extracted invoice service-call boundary:
  `infrastructure/confirmInvoiceData.ts`
- Confirm extracted invoice display helpers:
  `domain/confirmInvoiceDisplay.ts`
- Invoice layout: `components/invoice-layout/index.tsx`
- Purchase document helpers: `domain/purchaseDocument.ts`
- Print purchase: `pages/print-purchase/index.tsx`
- Print purchase orchestration:
  `application/print-purchase/usePrintPurchasePage.ts`
- View purchase route: `pages/view-purchase/index.tsx`
- View purchase orchestration:
  `application/view-purchase/useViewPurchasePage.ts`
- View purchase service-call boundary: `infrastructure/viewPurchaseData.ts`

## Runtime Layers

- `pages`: route-level screen rendering for confirm, view, and print purchase
  documents.
- `application`: route state, navigation side effects, regeneration/save
  orchestration, print-session reads, and auto-print timing.
- `domain`: pure display helpers for extracted invoice rows, purchase-document
  currency formatting, subtotal calculation, item-table display fallbacks,
  payment display labels, and print-session key ownership.
- `infrastructure`: invoice extractor and purchase service wrappers.
- `components/invoice-layout`: printable invoice composition shared by purchase
  document screens.

## Data Boundaries

- Purchase data should come from `infrastructure` wrappers backed by
  `src/services/api/purchases.service.ts`.
- Invoice extraction/save calls should come from `infrastructure` wrappers
  backed by `src/services/invoiceExtractor.ts`.
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
- Keep service calls in `infrastructure`; pages and application hooks should not
  import `src/services` directly.
