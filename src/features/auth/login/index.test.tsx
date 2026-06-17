import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import Login from '.';

const authStoreState = vi.hoisted(() => ({
  error: null as string | null,
  loading: false,
  login: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => authStoreState,
}));

const createDeferred = <T,>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const fillLoginForm = () => {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'user@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'secret' },
  });
};

describe('Login', () => {
  it('ignores duplicate submits while login is pending', async () => {
    const login = createDeferred<void>();
    authStoreState.error = null;
    authStoreState.loading = false;
    authStoreState.login = vi.fn().mockReturnValue(login.promise);
    render(<Login />);
    fillLoginForm();

    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(authStoreState.login).toHaveBeenCalledOnce();
    expect(authStoreState.login).toHaveBeenCalledWith(
      'user@example.com',
      'secret'
    );

    login.resolve();
    await login.promise;
  });

  it('allows retry after a pending login finishes', async () => {
    const firstLogin = createDeferred<void>();
    const secondLogin = createDeferred<void>();
    authStoreState.error = null;
    authStoreState.loading = false;
    authStoreState.login = vi
      .fn()
      .mockReturnValueOnce(firstLogin.promise)
      .mockReturnValueOnce(secondLogin.promise);
    render(<Login />);
    fillLoginForm();

    const submitButton = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(submitButton);
    firstLogin.resolve();
    await firstLogin.promise;
    fireEvent.click(submitButton);

    expect(authStoreState.login).toHaveBeenCalledTimes(2);

    secondLogin.resolve();
    await secondLogin.promise;
  });
});
