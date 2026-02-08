import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MinStockEditor from './MinStockEditor';

const capturedProps = vi.hoisted(() => ({
  minStockEditInPlace: null as Record<string, unknown> | null,
}));

vi.mock('./GenericEditInPlaceFactory', () => ({
  MinStockEditInPlace: (props: Record<string, unknown>) => {
    capturedProps.minStockEditInPlace = props;
    return <div data-testid="min-stock-edit-in-place" />;
  },
}));

describe('MinStockEditor', () => {
  beforeEach(() => {
    capturedProps.minStockEditInPlace = null;
  });

  it('maps props to MinStockEditInPlace with default tab index', () => {
    const onStartEdit = vi.fn();
    const onStopEdit = vi.fn();
    const onChange = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <MinStockEditor
        isEditing={false}
        minStockValue="15"
        currentMinStock={8}
        onStartEdit={onStartEdit}
        onStopEdit={onStopEdit}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    );

    expect(capturedProps.minStockEditInPlace).toMatchObject({
      isEditing: false,
      value: 8,
      inputValue: '15',
      tabIndex: 11,
      onStartEdit,
      onStopEdit,
      onChange,
      onKeyDown,
      disabled: false,
    });
  });

  it('uses custom tab index and disabled flag when provided', () => {
    render(
      <MinStockEditor
        isEditing={true}
        minStockValue="4"
        currentMinStock={4}
        tabIndex={88}
        onStartEdit={vi.fn()}
        onStopEdit={vi.fn()}
        onChange={vi.fn()}
        onKeyDown={vi.fn()}
        disabled={true}
      />
    );

    expect(capturedProps.minStockEditInPlace).toMatchObject({
      isEditing: true,
      value: 4,
      inputValue: '4',
      tabIndex: 88,
      disabled: true,
    });
  });
});
