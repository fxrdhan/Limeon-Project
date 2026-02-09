import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registerSpy } = vi.hoisted(() => ({
  registerSpy: vi.fn(),
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: registerSpy,
  },
  CategoryScale: { id: 'CategoryScale' },
  LinearScale: { id: 'LinearScale' },
  PointElement: { id: 'PointElement' },
  LineElement: { id: 'LineElement' },
  BarElement: { id: 'BarElement' },
  Title: { id: 'Title' },
  Tooltip: { id: 'Tooltip' },
  Legend: { id: 'Legend' },
  ArcElement: { id: 'ArcElement' },
}));

describe('ChartComponents', () => {
  beforeEach(() => {
    registerSpy.mockClear();
    vi.resetModules();
  });

  it('registers Chart.js components once and renders null', async () => {
    const { default: ChartRegistration } = await import('./ChartComponents');

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerSpy.mock.calls[0]).toHaveLength(9);

    const { container } = render(<ChartRegistration />);
    expect(container).toBeEmptyDOMElement();
  });
});
