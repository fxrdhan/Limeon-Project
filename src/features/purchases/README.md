# Purchases Ownership Map

This feature owns purchase document and invoice-facing screens that are separate
from the editable purchase-management workflow.

- Confirm extracted invoice: `confirm-invoice/index.tsx`
- Invoice layout: `invoice-layout/index.tsx`
- Print purchase: `print-purchase/index.tsx`
- View purchase: `view-purchase/index.tsx`

## Runtime Layers

This area is intentionally route-screen oriented today.

- `confirm-invoice`: review and confirmation flow after invoice extraction.
- `invoice-layout`: printable invoice composition shared by purchase document
  screens.
- `print-purchase`: print-focused route output.
- `view-purchase`: read-only purchase detail route.

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
