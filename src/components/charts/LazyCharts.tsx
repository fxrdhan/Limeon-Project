import { lazy, Suspense, ComponentProps } from 'react';

// Lazy load individual chart components
const LineChart = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);
const PieChart = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Pie }))
);
const BarChart = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Bar }))
);
const DoughnutChart = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Doughnut }))
);

// Lazy load Chart.js registration
const ChartRegistration = lazy(() =>
  import('./ChartComponents').then(() => ({ default: () => null }))
);

const ChartLoadingFallback = () => (
  <div className="h-64 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
    <span className="text-slate-500">Loading chart...</span>
  </div>
);

export const Line = (
  props: ComponentProps<(typeof import('react-chartjs-2'))['Line']>
) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <ChartRegistration />
    <LineChart {...props} />
  </Suspense>
);

export const Pie = (
  props: ComponentProps<(typeof import('react-chartjs-2'))['Pie']>
) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <ChartRegistration />
    <PieChart {...props} />
  </Suspense>
);

export const Bar = (
  props: ComponentProps<(typeof import('react-chartjs-2'))['Bar']>
) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <ChartRegistration />
    <BarChart {...props} />
  </Suspense>
);

export const Doughnut = (
  props: ComponentProps<(typeof import('react-chartjs-2'))['Doughnut']>
) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <ChartRegistration />
    <DoughnutChart {...props} />
  </Suspense>
);
