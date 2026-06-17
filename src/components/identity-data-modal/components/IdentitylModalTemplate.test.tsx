import { act, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import IdentityModalTemplate from './IdentitylModalTemplate';

const {
  focusIdentitySearchInputMock,
  getExitCompleteHandler,
  setExitCompleteHandler,
} = vi.hoisted(() => {
  let exitCompleteHandler: (() => void) | undefined;

  return {
    focusIdentitySearchInputMock: vi.fn(),
    getExitCompleteHandler: () => exitCompleteHandler,
    setExitCompleteHandler: (handler: (() => void) | undefined) => {
      exitCompleteHandler = handler;
    },
  };
});

vi.mock('../focus', () => ({
  focusIdentitySearchInput: focusIdentitySearchInputMock,
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({
    children,
    onExitComplete,
  }: {
    children: ReactNode;
    onExitComplete?: () => void;
  }) => {
    setExitCompleteHandler(onExitComplete);
    return <>{children}</>;
  },
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      ...props
    }: {
      animate?: unknown;
      children?: ReactNode;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    } & React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe('IdentityModalTemplate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    focusIdentitySearchInputMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setExitCompleteHandler(undefined);
  });

  it('cancels pending close focus frame when unmounted', () => {
    let queuedFrame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      queuedFrame = callback;
      return 29;
    });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const onClose = vi.fn();

    const view = render(
      <IdentityModalTemplate isOpen onClose={onClose}>
        <div>Identity content</div>
      </IdentityModalTemplate>
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (!(backdrop instanceof HTMLElement)) {
      throw new Error('Expected identity modal backdrop to render');
    }

    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledOnce();

    view.unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(29);

    act(() => {
      queuedFrame?.(0);
    });

    expect(focusIdentitySearchInputMock).not.toHaveBeenCalled();
  });

  it('cancels pending exit focus timer when reopened before the delay', () => {
    const resetInternalState = vi.fn();
    const view = render(
      <IdentityModalTemplate
        isOpen={false}
        onClose={vi.fn()}
        resetInternalState={resetInternalState}
      >
        <div>Identity content</div>
      </IdentityModalTemplate>
    );

    act(() => {
      getExitCompleteHandler()?.();
    });

    expect(resetInternalState).toHaveBeenCalledOnce();

    view.rerender(
      <IdentityModalTemplate
        isOpen
        onClose={vi.fn()}
        resetInternalState={resetInternalState}
      >
        <div>Identity content</div>
      </IdentityModalTemplate>
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(focusIdentitySearchInputMock).not.toHaveBeenCalled();
  });
});
