# Sales Ownership Map

This feature owns the sales list entrypoint and create-sale workflow.

- Sales list route entry: `index.tsx`
- Create-sale page: `create-sale/index.tsx`
- Sale form state: `hooks/useSaleForm.ts`
- Item-selection side effects: `hooks/useSaleItemSelectionEffect.ts`
- Visible form sections: `components/SaleInfoSection.tsx`,
  `components/SaleItemsSection.tsx`

## Runtime Layers

Use the narrowest owner for changes.

- `index.tsx`: sales list route-level screen.
- `create-sale`: page composition, navigation, add-item modal state, and submit
  wiring.
- `hooks`: form state, sale item updates, total calculation, and item-selection
  effects.
- `components`: visible fields, item rows, and user interaction controls.

## Data Boundaries

- Sale persistence should stay behind `src/services/api/sales.service.ts`.
- Item lookup should use shared item-selection hooks or item-management public
  APIs.
- New item creation must go through `src/features/item-management/public/ItemModal`.

## Boundary Rules

- Do not add Supabase calls directly to sales components.
- Keep sale calculations in the form hook or a future pure helper.
- Keep create-sale page focused on orchestration; move growing workflow state
  into hooks before adding more UI branches.
- Do not import item-management internals for item creation or item modal flows.
