import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { CompanyProfile } from '../../../types';
import {
  buildProfileEditValues,
  createDefaultCompanyProfile,
  fetchCompanyProfile,
  updateCompanyProfileField,
} from './profileData';

const { mockCompanyProfileService } = vi.hoisted(() => ({
  mockCompanyProfileService: {
    createProfile: vi.fn(),
    getProfile: vi.fn(),
    updateProfileField: vi.fn(),
  },
}));

vi.mock('@/services/api/companyProfile.service', () => ({
  companyProfileService: mockCompanyProfileService,
}));

const createProfile = (
  overrides: Partial<CompanyProfile> = {}
): CompanyProfile => ({
  address: 'Jl. Merdeka',
  email: null,
  id: 'company-1',
  name: 'Apotek Sehat',
  pharmacist_license: null,
  pharmacist_name: null,
  phone: null,
  tax_id: null,
  website: null,
  ...overrides,
});

describe('profile data boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes null profile fields to editable empty strings', () => {
    expect(
      buildProfileEditValues(
        createProfile({
          phone: '021',
          website: null,
        })
      )
    ).toMatchObject({
      name: 'Apotek Sehat',
      phone: '021',
      website: '',
    });
  });

  it('fetches the company profile through the company profile service', async () => {
    const profile = createProfile();
    mockCompanyProfileService.getProfile.mockResolvedValue({
      data: profile,
      error: null,
    });

    await expect(fetchCompanyProfile()).resolves.toBe(profile);
  });

  it('updates a company profile field through the company profile service', async () => {
    mockCompanyProfileService.updateProfileField.mockResolvedValue({
      data: null,
      error: null,
    });

    await updateCompanyProfileField('company-1', {
      field: 'phone',
      value: '021',
    });

    expect(mockCompanyProfileService.updateProfileField).toHaveBeenCalledWith(
      'company-1',
      'phone',
      '021'
    );
  });

  it('keeps the missing-profile-id update error', async () => {
    await expect(
      updateCompanyProfileField(undefined, {
        field: 'phone',
        value: '021',
      })
    ).rejects.toThrow('Profil ID tidak ditemukan untuk diperbarui.');
    expect(mockCompanyProfileService.updateProfileField).not.toHaveBeenCalled();
  });

  it('creates a company profile with the previous default payload', async () => {
    const response = { data: createProfile(), error: null };
    mockCompanyProfileService.createProfile.mockResolvedValue(response);

    await expect(createDefaultCompanyProfile()).resolves.toBe(response);
    expect(mockCompanyProfileService.createProfile).toHaveBeenCalledWith({
      address: 'Alamat Lengkap Apotek/Klinik Anda',
      name: 'Nama Apotek/Klinik Anda',
    });
  });
});
