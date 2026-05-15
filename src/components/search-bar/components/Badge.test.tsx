import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { BadgeConfig } from '../types/badge';
import Badge from './Badge';

const createValueBadgeConfig = (
  overrides: Partial<BadgeConfig> = {}
): BadgeConfig => ({
  id: 'condition-0-value',
  type: 'value',
  label: 'Acetyl',
  canClear: true,
  onClear: vi.fn(),
  canEdit: true,
  onEdit: vi.fn(),
  ...overrides,
});

describe('Badge accessibility', () => {
  it('keeps hidden action labels out of the badge accessible name', () => {
    render(<Badge config={createValueBadgeConfig()} />);

    const badge = screen.getByRole('button', {
      name: /^Value Acetyl\./,
    });

    expect(badge.textContent?.includes('Acetyl')).toBe(true);
    expect(
      screen.queryByRole('button', { name: 'Remove value Acetyl' })
    ).toBeNull();
  });

  it('exposes a specific delete action when the badge receives focus', () => {
    render(<Badge config={createValueBadgeConfig()} />);

    const badge = screen.getByRole('button', {
      name: /^Value Acetyl\./,
    });

    fireEvent.focus(badge);

    expect(
      screen.getByRole('button', { name: 'Remove value Acetyl' })
    ).not.toBeNull();
  });

  it('deletes a focused badge with Delete', () => {
    const onClear = vi.fn();
    render(<Badge config={createValueBadgeConfig({ onClear })} />);

    const badge = screen.getByRole('button', {
      name: /^Value Acetyl\./,
    });

    fireEvent.keyDown(badge, { key: 'Delete' });

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('deletes a clicked badge with Backspace', () => {
    const onClear = vi.fn();
    render(<Badge config={createValueBadgeConfig({ onClear })} />);

    const badge = screen.getByRole('button', {
      name: /^Value Acetyl\./,
    });

    fireEvent.click(badge);

    expect(document.activeElement).toBe(badge);

    fireEvent.keyDown(badge, { key: 'Backspace' });

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('selects a clicked badge', () => {
    const onSelect = vi.fn();
    render(<Badge config={createValueBadgeConfig()} onSelect={onSelect} />);

    const badge = screen.getByRole('button', {
      name: /^Value Acetyl\./,
    });

    fireEvent.click(badge);

    expect(onSelect).toHaveBeenCalled();
  });
});
