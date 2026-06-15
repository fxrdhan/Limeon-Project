# Sales Ownership Map

This feature owns the sales list entrypoint and create-sale workflow.

- Sales list route entry: `pages/list/index.tsx`
- Sales list orchestration: `application/list/useSalesListPage.ts`
- Sales list service-call boundary: `infrastructure/salesListData.ts`
- Sales list labels: `domain/salesListLabels.ts`
- Sales list view model types: `domain/types.ts`
- Create-sale page: `pages/create-sale/index.tsx`
- Sale form state: `application/create-sale/useSaleForm.ts`
- Sale form pure validation and payload helpers: `domain/saleForm.ts`
- Sale form service-call boundary: `infrastructure/saleFormData.ts`
- Item-selection side effects:
  `application/create-sale/useSaleItemSelectionEffect.ts`
- Visible form sections: `components/SaleInfoSection.tsx`,
  `components/SaleItemsSection.tsx`

## Runtime Layers

Use the narrowest owner for changes.

- `pages`: route-level screen rendering, navigation, add-item modal state, and
  visible page composition.
- `application`: sales-list query/mutation orchestration, sale form state, sale
  item updates, total calculation, and item-selection effects.
- `domain`: pure labels, template escaping, sale form validation/payload
  helpers, and list view model types.
- `infrastructure`: service-call wrappers for sales list and create-sale
  persistence.
- `components`: visible fields, item rows, and user interaction controls.

## Data Boundaries

- Sale persistence should stay behind `src/services/api/sales.service.ts`.
- Item lookup should use shared item-selection hooks or item-management public
  APIs.
- New item creation must go through
  `src/features/item-management/public/ItemModal.tsx`.

## Boundary Rules

- Do not add Supabase calls directly to sales components.
- Keep sale calculations and validation in `domain/saleForm.ts`.
- Keep `pages/list/index.tsx` focused on rendering the list screen; sales-list
  query/mutation orchestration belongs in `application/list/useSalesListPage.ts`.
- Keep create-sale page focused on screen composition; move growing workflow
  state into `application/create-sale` before adding more UI branches.
- Keep service calls in `infrastructure`; application hooks should not import
  `src/services` directly.
- Do not import item-management internals for item creation or item modal flows.
