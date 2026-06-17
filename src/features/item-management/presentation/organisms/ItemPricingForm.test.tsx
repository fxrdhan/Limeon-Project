import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import ItemPricingForm from './ItemPricingForm';
import type { ItemPricingFormProps } from './item-pricing-form/types';

const buildProps = (
  overrides: Partial<ItemPricingFormProps> = {}
): ItemPricingFormProps => ({
  formData: {
    base_price: 1000,
    sell_price: 1250,
    is_level_pricing_active: true,
  },
  displayBasePrice: '1000',
  displaySellPrice: '1250',
  baseUnitId: 'unit-base',
  baseUnit: 'Tablet',
  baseUnitOptions: [],
  marginEditing: {
    isEditing: false,
    percentage: '25',
  },
  calculatedMargin: 25,
  onBaseUnitChange: vi.fn(),
  onBasePriceChange: vi.fn(),
  onSellPriceChange: vi.fn(),
  onStartEditMargin: vi.fn(),
  onStopEditMargin: vi.fn(),
  onMarginInputChange: vi.fn(),
  onMarginKeyDown: vi.fn(),
  ...overrides,
});

describe('ItemPricingForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps disabled header actions out of the tab order without toggling the section', () => {
    const onExpand = vi.fn();
    const onShowLevelPricing = vi.fn();

    render(
      <ItemPricingForm
        {...buildProps({
          disabled: true,
          isExpanded: true,
          onExpand,
          onShowLevelPricing,
          showLevelPricing: true,
        })}
      />
    );

    const settingsButton = screen.getByRole('button', {
      name: 'Atur baseline harga bertingkat',
    });
    const menuButton = screen.getByRole('button', {
      name: 'Buka menu pengaturan harga',
    });

    expect(settingsButton.getAttribute('aria-disabled')).toBe('true');
    expect(settingsButton.getAttribute('tabindex')).toBe('-1');
    expect(menuButton.getAttribute('aria-disabled')).toBe('true');
    expect(menuButton.getAttribute('tabindex')).toBe('-1');

    fireEvent.click(settingsButton);
    fireEvent.click(menuButton);

    expect(onExpand).not.toHaveBeenCalled();
    expect(onShowLevelPricing).not.toHaveBeenCalled();
  });

  it('cancels pending expand focus frames on unmount', () => {
    const scheduledFrames = new Map<number, FrameRequestCallback>();
    const cancelAnimationFrameMock = vi.fn((frameId: number) => {
      scheduledFrames.delete(frameId);
    });
    let nextFrameId = 1;
    const onExpand = vi.fn();

    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      scheduledFrames.set(frameId, callback);
      return frameId;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      cancelAnimationFrameMock as typeof cancelAnimationFrame
    );

    const { container, rerender, unmount } = render(
      <ItemPricingForm
        {...buildProps({
          isExpanded: false,
          onExpand,
        })}
      />
    );
    const header = container.querySelector<HTMLElement>('[role="button"]');

    expect(header).not.toBeNull();

    fireEvent.keyDown(header as HTMLElement, { key: 'Enter' });

    expect(onExpand).toHaveBeenCalledOnce();

    rerender(
      <ItemPricingForm
        {...buildProps({
          isExpanded: true,
          onExpand,
        })}
      />
    );

    expect(scheduledFrames.size).toBe(1);

    unmount();

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);
    expect(scheduledFrames.size).toBe(0);
  });
});
