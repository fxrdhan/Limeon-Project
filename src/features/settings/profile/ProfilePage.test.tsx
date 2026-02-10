import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './ProfilePage';

const getProfileMock = vi.hoisted(() => vi.fn());
const updateProfileFieldMock = vi.hoisted(() => vi.fn());
const createProfileMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/api/companyProfile.service', () => ({
  companyProfileService: {
    getProfile: getProfileMock,
    updateProfileField: updateProfileFieldMock,
    createProfile: createProfileMock,
  },
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderPage = () => {
  const client = createClient();

  return render(
    <QueryClientProvider client={client}>
      <ProfilePage />
    </QueryClientProvider>
  );
};

const buildProfile = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'profile-1',
    name: 'PharmaSys',
    address: 'Jl. Sehat 1',
    phone: '08123',
    email: 'hello@pharmasys.id',
    website: 'https://pharmasys.id',
    tax_id: 'NPWP-001',
    pharmacist_name: 'Apt. Siti',
    pharmacist_license: 'SIPA-001',
    ...overrides,
  }) as never;

describe('ProfilePage', () => {
  beforeEach(() => {
    getProfileMock.mockReset();
    updateProfileFieldMock.mockReset();
    createProfileMock.mockReset();

    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('shows loading and error states', async () => {
    getProfileMock.mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByText('Memuat profil perusahaan...')).toBeInTheDocument();

    getProfileMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'fetch failed' },
    });

    renderPage();
    expect(await screen.findByText('Error: fetch failed')).toBeInTheDocument();
  });

  it('creates profile when empty state appears', async () => {
    getProfileMock.mockResolvedValue({ data: null, error: null });
    createProfileMock.mockResolvedValue({
      data: buildProfile({ name: 'New Pharma' }),
      error: null,
    });

    renderPage();

    expect(
      await screen.findByText(
        'Belum ada data profil. Tambahkan profil perusahaan Anda.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Profil' }));

    await waitFor(() => {
      expect(createProfileMock).toHaveBeenCalledWith({
        name: 'Nama Apotek/Klinik Anda',
        address: 'Alamat Lengkap Apotek/Klinik Anda',
      });
      expect(window.alert).toHaveBeenCalledWith(
        'Profil berhasil dibuat. Silakan lengkapi data.'
      );
    });
  });

  it('shows create profile errors from service and thrown exception', async () => {
    getProfileMock.mockResolvedValue({ data: null, error: null });

    createProfileMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'insert failed' },
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Tambah Profil' })
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Gagal membuat profil: insert failed'
      );
    });

    createProfileMock.mockRejectedValueOnce(new Error('network down'));

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Profil' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Terjadi kesalahan saat membuat profil: network down'
      );
    });

    createProfileMock.mockRejectedValueOnce('unknown');

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Profil' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Terjadi kesalahan saat membuat profil: Kesalahan tidak diketahui'
      );
    });
  });

  it('edits, saves and cancels profile fields', async () => {
    getProfileMock.mockResolvedValue({
      data: buildProfile(),
      error: null,
    });
    updateProfileFieldMock.mockResolvedValue({ data: null, error: null });

    renderPage();

    expect(await screen.findByText('Profil Perusahaan')).toBeInTheDocument();
    expect(screen.getByText('PharmaSys')).toBeInTheDocument();

    const getNameFieldContainer = () =>
      screen.getByText('Nama Perusahaan').closest('.mb-4') as HTMLElement;

    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[0]);

    const input = within(getNameFieldContainer()).getByRole('textbox');
    expect(input).toHaveValue('PharmaSys');

    fireEvent.change(input, { target: { value: 'PharmaSys Updated' } });
    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[1]);

    await waitFor(() => {
      expect(updateProfileFieldMock).toHaveBeenCalledWith(
        'profile-1',
        'name',
        'PharmaSys Updated'
      );
    });

    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[0]);
    const cancelInput = within(getNameFieldContainer()).getByRole('textbox');
    fireEvent.change(cancelInput, { target: { value: 'Temp Name' } });
    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[0]);

    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[0]);
    expect(within(getNameFieldContainer()).getByRole('textbox')).toHaveValue(
      'PharmaSys'
    );

    fireEvent.change(within(getNameFieldContainer()).getByRole('textbox'), {
      target: { value: 'Another Name' },
    });
    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[0]);

    expect(within(getNameFieldContainer()).queryByRole('textbox')).toBeNull();
  });

  it('shows mutation errors when update fails and when profile id is missing', async () => {
    getProfileMock.mockResolvedValue({
      data: buildProfile({ id: '' }),
      error: null,
    });
    updateProfileFieldMock.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    });

    const firstRender = renderPage();

    await screen.findByText('Nama Perusahaan');

    const getNameFieldContainer = () =>
      screen.getByText('Nama Perusahaan').closest('.mb-4') as HTMLElement;

    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[0]);
    fireEvent.click(within(getNameFieldContainer()).getAllByRole('button')[1]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Gagal memperbarui profil: Profil ID tidak ditemukan untuk diperbarui.'
      );
    });
    firstRender.unmount();

    getProfileMock.mockResolvedValueOnce({ data: buildProfile(), error: null });
    updateProfileFieldMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'update failed' },
    });

    renderPage();

    await screen.findByText('Nama Perusahaan');

    const getSecondNameFieldContainer = () =>
      screen.getByText('Nama Perusahaan').closest('.mb-4') as HTMLElement;

    fireEvent.click(
      within(getSecondNameFieldContainer()).getAllByRole('button')[0]
    );
    fireEvent.click(
      within(getSecondNameFieldContainer()).getAllByRole('button')[1]
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Gagal memperbarui profil: update failed'
      );
    });
  });
});
