import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import PopupMenuPopover from './index';

const { motionDivSpy } = vi.hoisted(() => ({
  motionDivSpy: vi.fn(),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      animate,
      exit,
      initial,
      layout,
      layoutId,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      children?: React.ReactNode;
      exit?: unknown;
      initial?: unknown;
      layout?: unknown;
      layoutId?: string;
      transition?: unknown;
    }) => {
      motionDivSpy({
        ...props,
        animate,
        exit,
        initial,
        layout,
        layoutId,
        transition,
      });
      return <div {...props}>{children}</div>;
    },
  },
}));

describe('PopupMenuPopover', () => {
  it('keeps the motion exit state mounted when exit animation is disabled', () => {
    const animate = { opacity: 1, scale: 1 };

    render(
      <PopupMenuPopover
        isOpen
        animate={animate}
        disableExitAnimation
        menuId="message-1"
      >
        menu
      </PopupMenuPopover>
    );

    expect(screen.getByText('menu')).toBeTruthy();
    expect(motionDivSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        animate,
        exit: animate,
      })
    );
  });

  it('uses the final motion state as the initial state when enter animation is disabled', () => {
    const animate = { opacity: 1, scale: 1, x: 12 };

    render(
      <PopupMenuPopover
        isOpen
        animate={animate}
        disableEnterAnimation
        menuId="message-2"
      >
        menu
      </PopupMenuPopover>
    );

    expect(motionDivSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        animate,
        initial: animate,
      })
    );
  });
});
