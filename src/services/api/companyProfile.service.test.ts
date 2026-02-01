import { describe, it, expect, vi, beforeEach } from 'vitest';
import { companyProfileService } from './companyProfile.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('CompanyProfileService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('returns null when profile not found', async () => {
    const query = createThenableQuery({
      data: null,
      error: { code: 'PGRST116' },
    });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.getProfile();
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns profile data when present', async () => {
    const query = createThenableQuery({
      data: { id: '1', name: 'Acme' },
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.getProfile();
    expect(result.data?.id).toBe('1');
  });

  it('returns null when profile data is empty', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.getProfile();
    expect(result.data).toBeNull();
  });

  it('returns error when profile fetch fails', async () => {
    const query = createThenableQuery({
      data: null,
      error: { code: 'OTHER' },
    });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.getProfile();
    expect(result.error).toBeTruthy();
  });

  it('handles profile fetch exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await companyProfileService.getProfile();
    expect(result.data).toBeNull();
  });

  it('updates profile fields', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.updateProfileField(
      '1',
      'name',
      ''
    );

    expect(result.error).toBeNull();
    expect(query.update).toHaveBeenCalledWith({ name: null });
  });

  it('updates profile fields with non-empty values', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.updateProfileField(
      '1',
      'address',
      'Street'
    );

    expect(result.error).toBeNull();
    expect(query.update).toHaveBeenCalledWith({ address: 'Street' });
  });

  it('handles profile update exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await companyProfileService.updateProfileField(
      '1',
      'name',
      'X'
    );
    expect(result.data).toBeNull();
  });

  it('creates a profile', async () => {
    const query = createThenableQuery({ data: { id: '1' }, error: null });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.createProfile({
      name: 'Company',
      address: 'Addr',
    });

    expect(result.data?.id).toBe('1');
  });

  it('returns null when create profile has no data', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await companyProfileService.createProfile({
      name: 'Company',
      address: 'Addr',
    });

    expect(result.data).toBeNull();
  });

  it('handles create profile exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await companyProfileService.createProfile({
      name: 'Company',
      address: 'Addr',
    });
    expect(result.data).toBeNull();
  });
});
