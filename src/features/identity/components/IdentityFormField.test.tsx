import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IdentityFormField from './IdentityFormField';

const useIdentityModalContextMock = vi.hoisted(() => vi.fn());
const capturedCalendarProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('@/contexts/IdentityModalContext', () => ({
  useIdentityModalContext: useIdentityModalContextMock,
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    onClick,
    title,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    title?: string;
    disabled?: boolean;
  }) => (
    <button type="button" title={title} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/input', () => ({
  default: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
  >(({ label, ...props }, ref) => (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )),
}));

vi.mock('@/components/dropdown', () => ({
  default: ({
    name,
    value,
    onChange,
  }: {
    name: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      <span>{`${name}:${value}`}</span>
      <button type="button" onClick={() => onChange('selected-option')}>
        choose-option
      </button>
    </div>
  ),
}));

vi.mock('@/components/calendar', () => ({
  default: (props: Record<string, unknown>) => {
    capturedCalendarProps.current = props;
    return (
      <button
        type="button"
        onClick={() => props.onChange?.(new Date('2024-05-20T00:00:00.000Z'))}
      >
        pick-date
      </button>
    );
  },
}));

const baseContext = () => ({
  editMode: {},
  editValues: {},
  loadingField: {},
  localData: {},
  mode: 'edit',
  useInlineFieldActions: true,
  toggleEdit: vi.fn(),
  handleChange: vi.fn(),
  handleSaveField: vi.fn(),
  handleCancelEdit: vi.fn(),
  setInputRef: vi.fn(),
});

describe('IdentityFormField', () => {
  beforeEach(() => {
    capturedCalendarProps.current = null;
  });

  it('renders display mode with formatted date and allows entering edit mode', () => {
    const context = baseContext();
    useIdentityModalContextMock.mockReturnValue({
      ...context,
      localData: {
        birth_date: '2024-05-20',
      },
      editValues: {
        birth_date: '2024-05-20',
      },
    });

    render(
      <IdentityFormField
        field={
          {
            key: 'birth_date',
            label: 'Tanggal Lahir',
            type: 'date',
          } as never
        }
      />
    );

    expect(screen.getByText('Tanggal Lahir')).toBeInTheDocument();
    expect(screen.getByTitle('Edit')).toBeInTheDocument();
    expect(screen.getByText('20 Mei 2024')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Edit'));
    expect(context.toggleEdit).toHaveBeenCalledWith('birth_date');
  });

  it('handles text edit actions, textarea changes, and radio dropdown selection', () => {
    const context = {
      ...baseContext(),
      editMode: {
        notes: true,
      },
      editValues: {
        notes: 'old note',
        status: 'aktif',
      },
      loadingField: {
        notes: false,
      },
    };

    useIdentityModalContextMock.mockReturnValue({
      ...context,
    });

    const { rerender } = render(
      <IdentityFormField
        field={
          {
            key: 'notes',
            label: 'Catatan',
            type: 'textarea',
          } as never
        }
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new note' } });

    expect(context.handleChange).toHaveBeenCalledWith('notes', 'new note');
    expect(context.setInputRef).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Batal'));
    fireEvent.click(screen.getByTitle('Simpan'));
    expect(context.handleCancelEdit).toHaveBeenCalledWith('notes');
    expect(context.handleSaveField).toHaveBeenCalledWith('notes');

    useIdentityModalContextMock.mockReturnValue({
      ...context,
      mode: 'add',
      editMode: {
        notes: true,
        status: true,
      },
    });

    rerender(
      <IdentityFormField
        field={
          {
            key: 'status',
            label: 'Status',
            isRadioDropdown: true,
            options: [
              { id: 'aktif', name: 'Aktif' },
              { id: 'nonaktif', name: 'Nonaktif' },
            ],
          } as never
        }
      />
    );

    fireEvent.click(screen.getByText('choose-option'));
    expect(context.handleChange).toHaveBeenCalledWith(
      'status',
      'selected-option'
    );
  });

  it('uses calendar picker in add mode and updates field value from selected date', () => {
    const context = baseContext();
    useIdentityModalContextMock.mockReturnValue({
      ...context,
      mode: 'add',
      editValues: {
        joined_date: '2024-01-01',
      },
    });

    render(
      <IdentityFormField
        field={
          {
            key: 'joined_date',
            label: 'Tanggal Bergabung',
            type: 'date',
          } as never
        }
      />
    );

    fireEvent.click(screen.getByText('pick-date'));

    expect(capturedCalendarProps.current).toBeTruthy();
    expect(context.handleChange).toHaveBeenCalledWith(
      'joined_date',
      '2024-05-20'
    );
  });

  it('renders direct edit field when inline actions are disabled', () => {
    const context = baseContext();
    useIdentityModalContextMock.mockReturnValue({
      ...context,
      useInlineFieldActions: false,
      mode: 'edit',
      editValues: {
        name: 'Supplier A',
      },
      localData: {
        name: 'Supplier A',
      },
    });

    render(
      <IdentityFormField
        field={
          {
            key: 'name',
            label: 'Nama Supplier',
            type: 'text',
          } as never
        }
      />
    );

    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Supplier A'), {
      target: { value: 'Supplier B' },
    });
    expect(context.handleChange).toHaveBeenCalledWith('name', 'Supplier B');
  });
});
