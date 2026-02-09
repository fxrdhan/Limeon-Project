import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import DescriptiveTextarea from './index';

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

describe('DescriptiveTextarea', () => {
  it('expands on hover in hover mode and forwards textarea changes', () => {
    const onChange = vi.fn();

    render(
      <DescriptiveTextarea
        label="Deskripsi"
        name="description"
        value=""
        onChange={onChange}
        expandOnClick={false}
      />
    );

    const toggle = screen.getByRole('button', { name: 'Deskripsi' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.mouseEnter(toggle);
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'updated text' },
    });
    expect(onChange).toHaveBeenCalled();

    fireEvent.mouseLeave(toggle);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('toggles by click in expandOnClick mode and honors showInitially updates', () => {
    const { rerender } = render(
      <DescriptiveTextarea
        label="Alamat"
        name="address"
        value="initial"
        onChange={vi.fn()}
        expandOnClick={true}
      />
    );

    const toggle = screen.getByRole('button', { name: 'Alamat' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    rerender(
      <DescriptiveTextarea
        label="Alamat"
        name="address"
        value="initial"
        onChange={vi.fn()}
        expandOnClick={true}
        showInitially={true}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('expands on keyboard focus when focus-visible in expandOnClick mode', () => {
    const matchesSpy = vi
      .spyOn(HTMLElement.prototype, 'matches')
      .mockImplementation(function (this: HTMLElement, selector: string) {
        if (selector === ':focus-visible') {
          return true;
        }
        return selector === this.tagName.toLowerCase();
      });

    render(
      <DescriptiveTextarea
        label="Keterangan"
        name="notes"
        value=""
        onChange={vi.fn()}
        expandOnClick={true}
      />
    );

    const toggle = screen.getByRole('button', { name: 'Keterangan' });
    fireEvent.focus(toggle);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    matchesSpy.mockRestore();
  });

  it('does not expand on focus when focus-visible is false, and keeps visible when already open', () => {
    const originalMatches = HTMLElement.prototype.matches;
    const matchesSpy = vi
      .spyOn(HTMLElement.prototype, 'matches')
      .mockImplementation(function (this: HTMLElement, selector: string) {
        if (selector === ':focus-visible') {
          return false;
        }
        return originalMatches.call(this, selector);
      });

    const { rerender } = render(
      <DescriptiveTextarea
        label="Catatan"
        name="notes"
        value=""
        onChange={vi.fn()}
        expandOnClick={true}
      />
    );

    const toggle = screen.getByRole('button', { name: 'Catatan' });
    fireEvent.focus(toggle);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    rerender(
      <DescriptiveTextarea
        label="Catatan"
        name="notes"
        value=""
        onChange={vi.fn()}
        expandOnClick={true}
        showInitially={true}
      />
    );

    fireEvent.focus(toggle);
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    matchesSpy.mockRestore();
  });

  it('handles textarea container hover callbacks and keeps expanded on textarea focus', () => {
    render(
      <DescriptiveTextarea
        label="Uraian"
        name="description"
        value="abc"
        onChange={vi.fn()}
        expandOnClick={false}
      />
    );

    const toggle = screen.getByRole('button', { name: 'Uraian' });
    fireEvent.mouseEnter(toggle);
    const textbox = screen.getByRole('textbox');
    expect(textbox).toBeInTheDocument();

    const overflowContainer = textbox.closest('.overflow-visible');
    expect(overflowContainer).toBeTruthy();
    fireEvent.mouseEnter(overflowContainer!);

    fireEvent.focus(textbox);
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    fireEvent.mouseLeave(overflowContainer!);
    fireEvent.mouseLeave(toggle);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
