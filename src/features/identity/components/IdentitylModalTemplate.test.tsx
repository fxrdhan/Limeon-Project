import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IdentityModalTemplate from './IdentitylModalTemplate';

vi.mock('motion/react', () => {
  return {
    AnimatePresence: ({
      children,
      onExitComplete,
    }: {
      children: ReactNode;
      onExitComplete?: () => void;
    }) => {
      React.useEffect(() => {
        if (!children && onExitComplete) {
          onExitComplete();
        }
      }, [children, onExitComplete]);

      return <>{children}</>;
    },
    motion: {
      div: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }) => (
        <div {...props}>{children}</div>
      ),
    },
  };
});

describe('IdentityModalTemplate', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders open modal and closes from overlay click while keeping panel click isolated', () => {
    const onClose = vi.fn();
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Cari data';
    const focusSpy = vi
      .spyOn(searchInput, 'focus')
      .mockImplementation(() => undefined);
    document.body.appendChild(searchInput);

    render(
      <IdentityModalTemplate isOpen={true} onClose={onClose}>
        <div>Modal Body</div>
      </IdentityModalTemplate>
    );

    expect(screen.getByText('Modal Body')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Modal Body'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(
      document.querySelector('[aria-hidden="true"]') as HTMLElement
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('runs exit completion callbacks when closed and restores focus after timeout', () => {
    const resetInternalState = vi.fn();
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Cari item';
    const focusSpy = vi
      .spyOn(searchInput, 'focus')
      .mockImplementation(() => undefined);
    document.body.appendChild(searchInput);

    render(
      <IdentityModalTemplate
        isOpen={false}
        onClose={vi.fn()}
        resetInternalState={resetInternalState}
      >
        <div>Hidden</div>
      </IdentityModalTemplate>
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(resetInternalState).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});
