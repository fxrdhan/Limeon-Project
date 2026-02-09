import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './index';

const useAuthStoreMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/components/input', () => ({
  default: ({
    label,
    value,
    type = 'text',
    onChange,
    className,
  }: {
    label: string;
    value: string;
    type?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
  }) => (
    <label className={className}>
      <span>{label}</span>
      <input aria-label={label} type={type} value={value} onChange={onChange} />
    </label>
  ),
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    isLoading,
    ...props
  }: React.ComponentPropsWithoutRef<'button'> & { isLoading?: boolean }) => (
    <button {...props} data-loading={isLoading ? 'true' : 'false'}>
      {children}
    </button>
  ),
}));

describe('Login', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
  });

  it('submits email and password using auth store login action', async () => {
    const login = vi.fn(async () => undefined);
    useAuthStoreMock.mockReturnValue({
      login,
      error: null,
      loading: false,
    });

    render(<Login />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Login' }));
    expect(login).toHaveBeenCalledWith('admin@example.com', 'secret123');
  });

  it('renders auth error state and loading indicator flag on submit button', () => {
    useAuthStoreMock.mockReturnValue({
      login: vi.fn(async () => undefined),
      error: 'Email atau password salah',
      loading: true,
    });

    render(<Login />);

    expect(screen.getByText('Email atau password salah')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toHaveAttribute(
      'data-loading',
      'true'
    );
  });
});
