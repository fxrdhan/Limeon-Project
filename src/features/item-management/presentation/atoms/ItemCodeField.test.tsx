import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemCodeField from './ItemCodeField';

const capturedProps = vi.hoisted(() => ({
  formField: null as Record<string, unknown> | null,
  input: null as Record<string, unknown> | null,
}));

vi.mock('@/components/form-field', () => ({
  default: ({
    children,
    ...props
  }: {
    children: ReactNode;
  } & Record<string, unknown>) => {
    capturedProps.formField = props;
    return <div data-testid="form-field">{children}</div>;
  },
}));

vi.mock('@/components/input', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.input = props;
    return <input data-testid="item-code-input" />;
  },
}));

describe('ItemCodeField', () => {
  beforeEach(() => {
    capturedProps.formField = null;
    capturedProps.input = null;
  });

  it('prioritizes generated code and passes readonly input props', () => {
    render(
      <ItemCodeField
        code="ITEM-001"
        generatedCode="AUTO-999"
        error="Kode tidak valid"
      />
    );

    expect(capturedProps.formField).toMatchObject({
      label: 'Kode Item',
      className: 'md:col-span-1',
    });
    expect(capturedProps.input).toMatchObject({
      name: 'code',
      value: 'AUTO-999',
      readOnly: true,
      placeholder: 'Auto-generated',
      className: 'w-full bg-slate-50',
      error: 'Kode tidak valid',
      required: true,
    });
  });

  it('uses existing code when generated code is missing', () => {
    render(<ItemCodeField code="ITEM-002" />);
    expect(capturedProps.input).toMatchObject({
      value: 'ITEM-002',
    });
  });
});
