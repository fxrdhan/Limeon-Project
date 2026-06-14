# Dashboard Ownership Map

This feature owns the main dashboard landing screen after login.

- Route entry: `pages/index.tsx`
- Display constants and formatters: `domain/dashboardDisplay.ts`
- Dashboard types: `domain/types.ts`
- Reusable dashboard primitives: `components/DashboardPrimitives.tsx`
- Dashboard sections: `components/HeroSection.tsx`,
  `components/OperationsSection.tsx`, `components/PerformanceSection.tsx`
- Data hooks: `application/useDashboardData.ts`
- Realtime hook: `application/useDashboardRealtime.ts`
- Service-call boundary: `infrastructure/dashboardData.ts`
- Realtime boundary: `infrastructure/dashboardRealtime.ts`

## Runtime Layers

- `pages`: route-level page composition, dashboard query hook wiring, and
  section ordering.
- `application`: React Query orchestration and realtime invalidation side
  effects.
- `domain`: dashboard display formatting and view model types shared inside
  this feature.
- `infrastructure`: backend RPC/service and realtime subscription wrappers.
- `components`: visible dashboard sections and presentational primitives.

## Boundary Rules

- Keep dashboard components free of direct service and Supabase imports.
- Keep dashboard application hooks free of direct service imports; call through
  `infrastructure`.
- Keep query keys in `src/constants/queryKeys.ts`.
- Keep numeric and currency display formatting in `domain/dashboardDisplay.ts`
  unless the formatter becomes app-wide.
- Preserve dashboard section copy, loading states, and layout order unless a
  product change explicitly requires UX changes.
