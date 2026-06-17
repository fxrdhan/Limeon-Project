import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { CompanyProfile } from '../../../../types';
import { useProfilePage } from './useProfilePage';

const {
  createDefaultCompanyProfileMock,
  fetchCompanyProfileMock,
  toastSuccessMock,
  updateCompanyProfileFieldMock,
} = vi.hoisted(() => ({
  createDefaultCompanyProfileMock: vi.fn(),
  fetchCompanyProfileMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateCompanyProfileFieldMock: vi.fn(),
}));

vi.mock('../../infrastructure/companyProfileData', () => ({
  createDefaultCompanyProfile: createDefaultCompanyProfileMock,
  fetchCompanyProfile: fetchCompanyProfileMock,
  updateCompanyProfileField: updateCompanyProfileFieldMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: toastSuccessMock,
  },
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createProfile = (): CompanyProfile => ({
  address: 'Jl. Merdeka',
  email: null,
  id: 'company-1',
  name: 'Apotek Sehat',
  pharmacist_license: null,
  pharmacist_name: null,
  phone: null,
  tax_id: null,
  website: null,
});

describe('useProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCompanyProfileMock.mockResolvedValue(null);
  });

  it('ignores duplicate profile creation while the first request is pending', async () => {
    const createProfileRequest = createDeferred<{
      data: CompanyProfile;
      error: null;
    }>();
    createDefaultCompanyProfileMock.mockReturnValue(
      createProfileRequest.promise
    );

    const { result } = renderHook(() => useProfilePage(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let firstCreatePromise: Promise<boolean> = Promise.resolve(false);
    let secondCreatePromise: Promise<boolean> = Promise.resolve(false);
    act(() => {
      firstCreatePromise = result.current.createProfile();
      secondCreatePromise = result.current.createProfile();
    });

    expect(createDefaultCompanyProfileMock).toHaveBeenCalledOnce();
    expect(result.current.isCreatingProfile).toBe(true);

    await act(async () => {
      createProfileRequest.resolve({
        data: createProfile(),
        error: null,
      });
      await firstCreatePromise;
      await secondCreatePromise;
      await Promise.resolve();
    });

    expect(toastSuccessMock).toHaveBeenCalledOnce();
    expect(result.current.isCreatingProfile).toBe(false);
  });
});
