import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginationButton } from './PaginationButton';
import { PageSizeSelector } from './PageSizeSelector';
import { FloatingWrapper } from './FloatingWrapper';
import { PaginationContent } from './PaginationContent';
import { CurrentPageDisplay } from './CurrentPageDisplay';

type MotionSpanMockProps = {
  children?: React.ReactNode;
  variants: {
    enter: (direction: number) => { opacity: number };
    exit: (direction: number) => { opacity: number };
  };
};

type MotionDivMockProps = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

const usePaginationContextMock = vi.hoisted(() => vi.fn());
const slidingSelectorPropsMock = vi.hoisted(() => vi.fn());

const motionSpanProps = vi.hoisted(() => ({
  current: null as MotionSpanMockProps | null,
}));
const motionDivProps = vi.hoisted(() => ({
  current: null as MotionDivMockProps | null,
}));

vi.mock('../hooks', () => ({
  usePaginationContext: usePaginationContextMock,
}));

vi.mock('@/components/shared/sliding-selector', () => ({
  SlidingSelector: ({
    options,
    activeKey,
    onSelectionChange,
    layoutId,
  }: {
    options: Array<{ key: string; value: number; activeLabel: string }>;
    activeKey: string;
    onSelectionChange: (
      key: string,
      value: number,
      event?: React.MouseEvent
    ) => void;
    layoutId: string;
  }) => {
    slidingSelectorPropsMock({ options, activeKey, layoutId });

    return (
      <div>
        <button
          type="button"
          data-testid="selector-no-event"
          onClick={() => onSelectionChange(options[0].key, options[0].value)}
        >
          no-event
        </button>

        {options.map(option => (
          <button
            key={option.key}
            type="button"
            data-testid={`selector-${option.key}`}
            onClick={event =>
              onSelectionChange(option.key, option.value, event)
            }
          >
            {option.activeLabel}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    span: (props: MotionSpanMockProps) => {
      motionSpanProps.current = props;
      return <span data-testid="motion-span">{props.children}</span>;
    },
    div: (props: MotionDivMockProps) => {
      motionDivProps.current = props;
      return (
        <div
          data-testid="motion-div"
          className={props.className}
          style={props.style}
          onClick={props.onClick}
        >
          {props.children}
        </div>
      );
    },
  },
}));

describe('pagination components', () => {
  beforeEach(() => {
    usePaginationContextMock.mockReset();
    slidingSelectorPropsMock.mockReset();
    motionSpanProps.current = null;
    motionDivProps.current = null;
  });

  it('handles pagination button clicks only when enabled', () => {
    const onClick = vi.fn();

    const { rerender } = render(
      <PaginationButton
        direction="next"
        disabled={false}
        onClick={onClick}
        ariaLabel="next"
      />
    );

    fireEvent.click(screen.getByLabelText('next'));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <PaginationButton
        direction="prev"
        disabled
        onClick={onClick}
        ariaLabel="prev"
      />
    );

    fireEvent.click(screen.getByLabelText('prev'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('maps page-size options and forwards selection changes (with and without event)', () => {
    const onSizeChange = vi.fn();

    render(
      <PageSizeSelector
        pageSizes={[10, -1]}
        currentSize={10}
        onSizeChange={onSizeChange}
      />
    );

    expect(slidingSelectorPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeKey: '10',
        layoutId: 'main-selector',
      })
    );

    const lastCall = slidingSelectorPropsMock.mock.calls.at(-1)?.[0];
    expect(lastCall.options).toEqual([
      {
        key: '10',
        value: 10,
        defaultLabel: '10',
        activeLabel: '10 items',
      },
      {
        key: '-1',
        value: -1,
        defaultLabel: 'U',
        activeLabel: 'Unlimited',
      },
    ]);

    fireEvent.click(screen.getByTestId('selector-no-event'));
    expect(onSizeChange).toHaveBeenCalledWith(10, expect.any(Object));

    fireEvent.click(screen.getByTestId('selector--1'));
    expect(onSizeChange).toHaveBeenCalledWith(-1, expect.any(Object));
  });

  it('renders and hides floating wrapper content based on visibility flags', () => {
    const { rerender } = render(
      <FloatingWrapper show hideWhenModalOpen={false}>
        <div data-testid="floating-child">child</div>
      </FloatingWrapper>
    );

    expect(screen.getByTestId('floating-child')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('motion-div'));
    expect(motionDivProps.current.onClick).toBeTypeOf('function');

    rerender(
      <FloatingWrapper show={false} hideWhenModalOpen={false}>
        <div data-testid="floating-child">child</div>
      </FloatingWrapper>
    );
    expect(screen.queryByTestId('floating-child')).not.toBeInTheDocument();

    rerender(
      <FloatingWrapper show hideWhenModalOpen>
        <div data-testid="floating-child">child</div>
      </FloatingWrapper>
    );
    expect(screen.queryByTestId('floating-child')).not.toBeInTheDocument();
  });

  it('returns null when window is unavailable in SSR-like runtime', () => {
    vi.stubGlobal('window', undefined);

    const result = FloatingWrapper({
      children: <div>child</div>,
      show: true,
      hideWhenModalOpen: false,
    });

    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('renders pagination content and handles prev/next/page-size interactions', () => {
    const onPageChange = vi.fn();
    const handleItemsPerPageClick = vi.fn();

    usePaginationContextMock.mockReturnValue({
      currentPage: 2,
      totalPages: 3,
      itemsPerPage: 10,
      onPageChange,
      handleItemsPerPageClick,
      direction: 1,
      className: 'custom-class',
      pageSizes: [10, 20],
    });

    const { rerender, container } = render(<PaginationContent />);

    fireEvent.click(screen.getByLabelText('Halaman sebelumnya'));
    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByTestId('selector-20'));
    expect(handleItemsPerPageClick).toHaveBeenCalledWith(
      20,
      expect.any(Object)
    );

    const mainContainer = container.querySelector('div.custom-class');
    expect(mainContainer).toHaveClass('mt-4');

    usePaginationContextMock.mockReturnValue({
      currentPage: 1,
      totalPages: 0,
      itemsPerPage: 10,
      onPageChange,
      handleItemsPerPageClick,
      direction: -1,
      className: 'custom-class',
      pageSizes: [10, 20],
    });

    rerender(<PaginationContent isFloating />);

    fireEvent.click(screen.getByLabelText('Halaman sebelumnya'));
    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));

    // still only the two calls from non-boundary branch above
    expect(onPageChange).toHaveBeenCalledTimes(2);

    const floatingContainer = container.querySelector(
      'div.rounded-full.shadow-2xl'
    );
    expect(floatingContainer).toBeInTheDocument();
    expect(floatingContainer).toHaveStyle({ willChange: 'transform' });
  });

  it('renders current page display and exposes motion variants for both directions', () => {
    render(<CurrentPageDisplay currentPage={7} direction={1} />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(motionSpanProps.current).toBeTruthy();

    const enterForward = motionSpanProps.current.variants.enter(1);
    const enterBackward = motionSpanProps.current.variants.enter(-1);
    const exitForward = motionSpanProps.current.variants.exit(1);
    const exitBackward = motionSpanProps.current.variants.exit(-1);

    expect(enterForward.opacity).toBe(0);
    expect(enterBackward.opacity).toBe(0);
    expect(exitForward.opacity).toBe(0);
    expect(exitBackward.opacity).toBe(0);

    render(<CurrentPageDisplay currentPage={8} direction={-1} isFloating />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
