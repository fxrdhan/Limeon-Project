import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Bar, Doughnut, Line, Pie } from './LazyCharts';

vi.mock('./ChartComponents', () => ({
  default: () => <div data-testid="chart-registration" />,
}));

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: { data: unknown }) => (
    <div data-testid="line-chart">{JSON.stringify(data)}</div>
  ),
  Pie: ({ data }: { data: unknown }) => (
    <div data-testid="pie-chart">{JSON.stringify(data)}</div>
  ),
  Bar: ({ data }: { data: unknown }) => (
    <div data-testid="bar-chart">{JSON.stringify(data)}</div>
  ),
  Doughnut: ({ data }: { data: unknown }) => (
    <div data-testid="doughnut-chart">{JSON.stringify(data)}</div>
  ),
}));

const chartData = {
  labels: ['A', 'B'],
  datasets: [{ data: [1, 2] }],
};

describe('LazyCharts', () => {
  it('renders Line chart with suspense fallback and registration component', async () => {
    render(<Line data={chartData} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('chart-registration')).not.toBeInTheDocument();
  });

  it('renders Pie, Bar, and Doughnut lazy chart variants', async () => {
    const { rerender } = render(<Pie data={chartData} />);
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    rerender(<Bar data={chartData} />);
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    rerender(<Doughnut data={chartData} />);
    await waitFor(() => {
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    });
  });
});
