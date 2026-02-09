import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComparisonModal from './ComparisonModal';

const useComparisonDataMock = vi.hoisted(() => vi.fn());
const comparisonHeaderProps = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);
const dualModeProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const singleModeProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      onAnimationComplete,
      ...props
    }: React.ComponentPropsWithoutRef<'div'> & {
      onAnimationComplete?: () => void;
    }) => {
      onAnimationComplete?.();
      return <div {...props}>{children}</div>;
    },
  },
}));

vi.mock('./hooks', () => ({
  useComparisonData: useComparisonDataMock,
}));

vi.mock('../../organisms', () => ({
  ComparisonHeader: (props: Record<string, unknown>) => {
    comparisonHeaderProps.push(props);
    return <div data-testid="comparison-header" />;
  },
  DualModeContent: (props: Record<string, unknown>) => {
    dualModeProps.push(props);
    return <div data-testid="dual-mode-content" />;
  },
}));

vi.mock('../../molecules', () => ({
  SingleModeContent: (props: Record<string, unknown>) => {
    singleModeProps.push(props);
    return <div data-testid="single-mode-content" />;
  },
}));

describe('ComparisonModal', () => {
  beforeEach(() => {
    useComparisonDataMock.mockReset();
    comparisonHeaderProps.length = 0;
    dualModeProps.length = 0;
    singleModeProps.length = 0;

    useComparisonDataMock.mockReturnValue({
      compData: {
        leftKode: 'A',
        rightKode: 'B',
      },
      originalData: {
        originalLeftKode: 'A',
        originalRightKode: 'B',
      },
    });
  });

  it('returns null for invalid single and dual mode states', () => {
    const first = render(
      <ComparisonModal
        isOpen={true}
        entityName="Kategori"
        currentData={{ name: 'N', description: 'D' }}
      />
    );
    expect(first.container.firstChild).toBeNull();
    first.unmount();

    const second = render(
      <ComparisonModal
        isOpen={true}
        isDualMode={true}
        entityName="Kategori"
        currentData={{ name: 'N', description: 'D' }}
        versionA={{ version_number: 1, entity_data: {} }}
      />
    );
    expect(second.container.firstChild).toBeNull();
  });

  it('returns null when comparison data hook has no data', () => {
    useComparisonDataMock.mockReturnValue({
      compData: null,
      originalData: null,
    });

    const { container } = render(
      <ComparisonModal
        isOpen={true}
        entityName="Kategori"
        selectedVersion={{ version_number: 1, entity_data: {} }}
        currentData={{ name: 'N', description: 'D' }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders single mode content and blurs focused element after animation', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const blurSpy = vi.spyOn(input, 'blur');

    render(
      <ComparisonModal
        isOpen={true}
        entityName="Kategori"
        selectedVersion={{ version_number: 2, entity_data: {} }}
        currentData={{ code: 'CUR', name: 'N', description: 'D' }}
      />
    );

    expect(screen.getByTestId('comparison-header')).toBeInTheDocument();
    expect(screen.getByTestId('single-mode-content')).toBeInTheDocument();
    expect(comparisonHeaderProps[0]).toMatchObject({
      isDualMode: false,
    });

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalled();
    });
  });

  it('renders dual mode content and keeps modal visible while closing animation runs', () => {
    render(
      <ComparisonModal
        isOpen={false}
        isClosing={true}
        entityName="Kategori"
        isDualMode={true}
        versionA={{ version_number: 1, entity_data: {} }}
        versionB={{ version_number: 2, entity_data: {} }}
        isFlipped={true}
        currentData={{ name: 'N', description: 'D' }}
      />
    );

    expect(screen.getByTestId('dual-mode-content')).toBeInTheDocument();
    expect(dualModeProps[0]).toMatchObject({
      entityName: 'Kategori',
      isFlipped: true,
    });
  });
});
