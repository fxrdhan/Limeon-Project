import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarginEditor from './MarginEditor';

const capturedProps = vi.hoisted(() => ({
  marginEditInPlace: null as Record<string, unknown> | null,
}));

vi.mock('./GenericEditInPlaceFactory', () => ({
  MarginEditInPlace: (props: Record<string, unknown>) => {
    capturedProps.marginEditInPlace = props;
    return <div data-testid="margin-edit-in-place" />;
  },
}));

describe('MarginEditor', () => {
  beforeEach(() => {
    capturedProps.marginEditInPlace = null;
  });

  it('maps props to MarginEditInPlace with default tab index', () => {
    const onStartEdit = vi.fn();
    const onStopEdit = vi.fn();
    const onChange = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <MarginEditor
        isEditing={false}
        marginPercentage="10"
        calculatedMargin={15.2}
        onStartEdit={onStartEdit}
        onStopEdit={onStopEdit}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    );

    expect(capturedProps.marginEditInPlace).toMatchObject({
      isEditing: false,
      value: 15.2,
      inputValue: '10',
      tabIndex: 14,
      onStartEdit,
      onStopEdit,
      onChange,
      onKeyDown,
      disabled: false,
    });
  });

  it('uses custom tab index and disabled flag when provided', () => {
    render(
      <MarginEditor
        isEditing={true}
        marginPercentage="2.5"
        calculatedMargin={null}
        tabIndex={99}
        onStartEdit={vi.fn()}
        onStopEdit={vi.fn()}
        onChange={vi.fn()}
        onKeyDown={vi.fn()}
        disabled={true}
      />
    );

    expect(capturedProps.marginEditInPlace).toMatchObject({
      isEditing: true,
      value: null,
      inputValue: '2.5',
      tabIndex: 99,
      disabled: true,
    });
  });
});
