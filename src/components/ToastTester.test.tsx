import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToastTester from './ToastTester';

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const configMock = vi.hoisted(() => ({
  toast_tester_enabled: true,
  random_item_generator_enabled: true,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('@/config', () => ({
  config: configMock,
  default: configMock,
}));

describe('ToastTester', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    configMock.toast_tester_enabled = true;
  });

  it('does not render when feature flag is disabled', () => {
    configMock.toast_tester_enabled = false;

    render(<ToastTester />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('triggers success and error toasts based on random selection', () => {
    const randomSpy = vi.spyOn(Math, 'random');

    render(<ToastTester />);

    randomSpy.mockReturnValueOnce(0); // success entry
    fireEvent.click(screen.getByRole('button', { name: /trigger toast/i }));
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);

    randomSpy.mockReturnValueOnce(0.95); // error entry
    fireEvent.click(screen.getByRole('button', { name: /trigger toast/i }));
    expect(toastErrorMock).toHaveBeenCalledTimes(1);

    randomSpy.mockRestore();
  });
});
