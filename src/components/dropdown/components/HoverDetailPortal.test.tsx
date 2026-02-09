import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import HoverDetailPortal from './HoverDetailPortal';

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

describe('HoverDetailPortal', () => {
  it('does not render when invisible or missing data', () => {
    const { rerender } = render(
      <HoverDetailPortal
        isVisible={false}
        position={{ top: 120, left: 240, direction: 'right' }}
        data={{
          id: '1',
          name: 'Paracetamol',
          code: 'PCM',
          description: 'Obat anti demam',
          updated_at: '2026-02-08T00:00:00.000Z',
        }}
      />
    );

    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();

    rerender(
      <HoverDetailPortal
        isVisible={true}
        position={{ top: 120, left: 240, direction: 'right' }}
        data={null}
      />
    );

    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
  });

  it('renders portal content with metadata and left/right arrow styles', () => {
    const { rerender } = render(
      <HoverDetailPortal
        isVisible={true}
        position={{ top: 120, left: 240, direction: 'right' }}
        data={{
          id: '1',
          name: 'Paracetamol',
          code: 'PCM',
          description: 'Obat anti demam',
          updated_at: '2026-02-08T00:00:00.000Z',
        }}
      />
    );

    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('PCM')).toBeInTheDocument();
    expect(screen.getByText('Obat anti demam')).toBeInTheDocument();
    expect(screen.getByText('Updated:')).toBeInTheDocument();

    const rightArrow = document.body.querySelector('[style*="left: -6px"]');
    expect(rightArrow).toBeInTheDocument();

    rerender(
      <HoverDetailPortal
        isVisible={true}
        position={{ top: 120, left: 240, direction: 'left' }}
        data={{
          id: '2',
          name: 'Amoxicillin',
          code: undefined,
          description: undefined,
          updated_at: undefined,
        }}
      />
    );

    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    const leftArrow = document.body.querySelector('[style*="right: -6px"]');
    expect(leftArrow).toBeInTheDocument();
  });
});
