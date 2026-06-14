# Blank Page Ownership Map

This feature owns the shared placeholder screen for unfinished routes.

- Route placeholder component: `index.tsx`
- Current route consumers: `src/app/routes/clinic/index.tsx`,
  `src/app/routes/inventory/index.tsx`, `src/app/routes/purchases/index.tsx`,
  `src/app/routes/reports/index.tsx`, `src/app/routes/settings/index.tsx`

## Runtime Layers

This feature is a single reusable route component.

- `index.tsx`: visible placeholder layout, copy props, badge state, and back
  navigation action.

## Boundary Rules

- Keep this component data-access free.
- Keep route-specific unfinished-page copy in the route that renders it unless
  the default copy is intentionally changed for every consumer.
- Preserve the default back-navigation behavior unless a route explicitly opts
  out through props.
