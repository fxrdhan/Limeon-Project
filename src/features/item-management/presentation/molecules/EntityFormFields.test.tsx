import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityFormFields from './EntityFormFields';

const useEntityModalMock = vi.hoisted(() => vi.fn());

vi.mock('../../shared/contexts/EntityModalContext', () => ({
  useEntityModal: useEntityModalMock,
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

vi.mock('@/components/descriptive-textarea', () => ({
  default: ({
    label,
    value,
    onChange,
    onFocus,
    onBlur,
    readOnly,
  }: {
    label: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    readOnly?: boolean;
  }) => (
    <label>
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={readOnly}
      />
    </label>
  ),
}));

const baseContext = () => ({
  form: {
    code: 'C-01',
    name: 'Entity Name',
    description: 'Entity Desc',
    address: 'Jl. Contoh',
  },
  ui: {
    entityName: 'Kategori',
  },
  action: {
    isLoading: false,
    isDeleting: false,
  },
  formActions: {
    setCode: vi.fn(),
    setName: vi.fn(),
    setDescription: vi.fn(),
    setAddress: vi.fn(),
  },
  realtime: {
    smartFormSync: {
      getFieldHandlers: vi.fn(() => ({
        onFocus: vi.fn(),
        onBlur: vi.fn(),
      })),
    },
  },
});

describe('EntityFormFields', () => {
  beforeEach(() => {
    useEntityModalMock.mockReset();
  });

  it('renders code/name fields and description textarea with realtime handlers', () => {
    const context = baseContext();
    useEntityModalMock.mockReturnValue(context);

    render(<EntityFormFields nameInputRef={{ current: null }} />);

    const codeInput = screen.getByLabelText('Code Kategori');
    const nameInput = screen.getByLabelText('Nama Kategori');
    const descTextarea = screen.getByLabelText('Deskripsi');

    fireEvent.change(codeInput, { target: { value: 'C-02' } });
    fireEvent.change(nameInput, { target: { value: 'Nama Baru' } });
    fireEvent.change(descTextarea, { target: { value: 'Desc Baru' } });

    fireEvent.focus(codeInput);
    fireEvent.blur(codeInput);
    fireEvent.focus(nameInput);
    fireEvent.blur(nameInput);
    fireEvent.focus(descTextarea);
    fireEvent.blur(descTextarea);

    expect(context.formActions.setCode).toHaveBeenCalledWith('C-02');
    expect(context.formActions.setName).toHaveBeenCalledWith('Nama Baru');
    expect(context.formActions.setDescription).toHaveBeenCalledWith(
      'Desc Baru'
    );
    expect(
      context.realtime.smartFormSync.getFieldHandlers
    ).toHaveBeenCalledWith('code');
    expect(
      context.realtime.smartFormSync.getFieldHandlers
    ).toHaveBeenCalledWith('name');
    expect(
      context.realtime.smartFormSync.getFieldHandlers
    ).toHaveBeenCalledWith('description');
  });

  it('switches to address field for manufacturer and applies read-only states', () => {
    const context = baseContext();
    useEntityModalMock.mockReturnValue({
      ...context,
      ui: {
        entityName: 'Produsen',
      },
      action: {
        isLoading: true,
        isDeleting: false,
      },
      formActions: {
        ...context.formActions,
        setCode: undefined,
      },
      realtime: null,
    });

    render(<EntityFormFields nameInputRef={{ current: null }} />);

    expect(screen.queryByLabelText('Code Produsen')).not.toBeInTheDocument();

    const nameInput = screen.getByLabelText('Nama Produsen');
    const addressTextarea = screen.getByLabelText('Alamat');

    expect(nameInput).toHaveAttribute('readonly');
    expect(addressTextarea).toHaveAttribute('readonly');

    fireEvent.change(addressTextarea, { target: { value: 'Alamat Baru' } });
    expect(context.formActions.setAddress).toHaveBeenCalledWith('Alamat Baru');
  });
});
