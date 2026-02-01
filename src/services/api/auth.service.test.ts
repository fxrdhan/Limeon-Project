import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  onAuthStateChange: vi.fn(),
  refreshSession: vi.fn(),
}));

const extractPathMock = vi.hoisted(() => vi.fn());
const deleteImageMock = vi.hoisted(() => vi.fn());
const uploadImageMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: authMock,
    from: fromMock,
  },
}));

vi.mock('@/services/api/storage.service', () => ({
  StorageService: {
    extractPathFromUrl: extractPathMock,
    deleteEntityImage: deleteImageMock,
    uploadEntityImage: uploadImageMock,
  },
}));

describe('AuthService', () => {
  const service = new AuthService();

  beforeEach(() => {
    fromMock.mockReset();
    Object.values(authMock).forEach(fn => {
      if (typeof fn === 'function') fn.mockReset();
    });
    extractPathMock.mockReset();
    deleteImageMock.mockReset();
    uploadImageMock.mockReset();
  });

  it('gets session and current user', async () => {
    authMock.getSession.mockResolvedValue({
      data: { session: { id: 's1' } },
      error: null,
    });
    authMock.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const sessionResult = await service.getSession();
    const userResult = await service.getCurrentUser();

    expect(sessionResult.data?.id).toBe('s1');
    expect(userResult.data?.id).toBe('u1');
  });

  it('returns error on session failure', async () => {
    authMock.getSession.mockRejectedValue(new Error('fail'));
    const result = await service.getSession();
    expect(result.error).toBeTruthy();
  });

  it('returns error on current user exception', async () => {
    authMock.getUser.mockRejectedValue(new Error('fail'));
    const result = await service.getCurrentUser();
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('fetches user profile and updates it', async () => {
    const query = createThenableQuery({ data: { id: 'u1' }, error: null });
    fromMock.mockReturnValue(query);

    const profileResult = await service.getUserProfile('u1');
    expect(profileResult.data?.id).toBe('u1');

    const updateQuery = createThenableQuery({
      data: { id: 'u1' },
      error: null,
    });
    fromMock.mockReturnValue(updateQuery);

    const updateResult = await service.updateUserProfile('u1', { name: 'New' });
    expect(updateResult.data?.id).toBe('u1');
    expect(updateQuery.update).toHaveBeenCalled();
  });

  it('handles profile fetch exception', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await service.getUserProfile('u1');
    expect(result.data).toBeNull();
  });

  it('signs in and fetches profile', async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { session: { id: 's1' }, user: { id: 'u1' } },
      error: null,
    });

    const query = createThenableQuery({
      data: { id: 'u1', name: 'User' },
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await service.signInWithPassword('a@b.com', 'pw');
    expect(result.data?.session.id).toBe('s1');
    expect(result.data?.user.id).toBe('u1');
  });

  it('handles sign-in errors and missing profile', async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: new Error('bad'),
    });

    const result = await service.signInWithPassword('a@b.com', 'pw');
    expect(result.data).toBeNull();

    authMock.signInWithPassword.mockResolvedValue({
      data: { session: { id: 's1' }, user: { id: 'u1' } },
      error: null,
    });
    const query = createThenableQuery({
      data: null,
      error: new Error('no user'),
    });
    fromMock.mockReturnValue(query);
    const result2 = await service.signInWithPassword('a@b.com', 'pw');
    expect(result2.data).toBeNull();
  });

  it('handles sign-in exceptions', async () => {
    authMock.signInWithPassword.mockRejectedValue(new Error('boom'));
    const result = await service.signInWithPassword('a@b.com', 'pw');
    expect(result.data).toBeNull();
  });

  it('signs up and signs out', async () => {
    authMock.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1' } },
      error: null,
    });
    const signUpResult = await service.signUp('a@b.com', 'pw');
    expect(signUpResult.data?.user.id).toBe('u1');

    authMock.signOut.mockResolvedValue({ error: null });
    const signOutResult = await service.signOut();
    expect(signOutResult.error).toBeNull();
  });

  it('handles sign out exceptions', async () => {
    authMock.signOut.mockRejectedValue(new Error('boom'));
    const result = await service.signOut();
    expect(result.data).toBeNull();
  });

  it('returns error when sign up fails', async () => {
    authMock.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: new Error('bad'),
    });
    const result = await service.signUp('a@b.com', 'pw');
    expect(result.data).toBeNull();
  });

  it('handles sign up exceptions', async () => {
    authMock.signUp.mockRejectedValue(new Error('boom'));
    const result = await service.signUp('a@b.com', 'pw');
    expect(result.data).toBeNull();
  });

  it('updates profile photo with storage', async () => {
    extractPathMock.mockReturnValue('profiles/u1.png');
    uploadImageMock.mockResolvedValue({
      publicUrl: 'https://example.com/u1.png',
    });

    const updateSpy = vi
      .spyOn(service, 'updateUserProfile')
      .mockResolvedValue({ data: { id: 'u1' } as never, error: null });

    const file = new File([new Uint8Array(10)], 'u1.png', {
      type: 'image/png',
    });
    const result = await service.updateProfilePhoto('u1', file, 'https://old');

    expect(deleteImageMock).toHaveBeenCalled();
    expect(result.data?.photoUrl).toBe('https://example.com/u1.png');
    updateSpy.mockRestore();
  });

  it('skips deleting old photo when path missing', async () => {
    extractPathMock.mockReturnValue(null);
    uploadImageMock.mockResolvedValue({
      publicUrl: 'https://example.com/u1.png',
    });

    const updateSpy = vi
      .spyOn(service, 'updateUserProfile')
      .mockResolvedValue({ data: { id: 'u1' } as never, error: null });

    const file = new File([new Uint8Array(10)], 'u1.png', {
      type: 'image/png',
    });
    const result = await service.updateProfilePhoto('u1', file, 'https://old');

    expect(deleteImageMock).not.toHaveBeenCalled();
    expect(result.data?.photoUrl).toBe('https://example.com/u1.png');
    updateSpy.mockRestore();
  });

  it('handles update profile photo failures', async () => {
    uploadImageMock.mockResolvedValue({
      publicUrl: 'https://example.com/u1.png',
    });
    const updateSpy = vi
      .spyOn(service, 'updateUserProfile')
      .mockResolvedValue({ data: null, error: new Error('fail') });

    const file = new File([new Uint8Array(10)], 'u1.png', {
      type: 'image/png',
    });
    const result = await service.updateProfilePhoto('u1', file);
    expect(result.data).toBeNull();

    updateSpy.mockRestore();
  });

  it('handles update profile photo exceptions', async () => {
    uploadImageMock.mockRejectedValue(new Error('boom'));
    const file = new File([new Uint8Array(10)], 'u1.png', {
      type: 'image/png',
    });
    const result = await service.updateProfilePhoto('u1', file);
    expect(result.data).toBeNull();
  });

  it('resets and updates password', async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMock.updateUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const reset = await service.resetPassword('a@b.com');
    const update = await service.updatePassword('new');

    expect(reset.error).toBeNull();
    expect(update.data?.id).toBe('u1');
  });

  it('handles reset/update/refresh errors', async () => {
    authMock.resetPasswordForEmail.mockRejectedValue(new Error('boom'));
    authMock.updateUser.mockRejectedValue(new Error('boom'));
    authMock.refreshSession.mockRejectedValue(new Error('boom'));

    const reset = await service.resetPassword('a@b.com');
    const update = await service.updatePassword('new');
    const refresh = await service.refreshSession();

    expect(reset.data).toBeNull();
    expect(update.data).toBeNull();
    expect(refresh.data).toBeNull();
  });

  it('handles auth state change and refresh', async () => {
    authMock.onAuthStateChange.mockReturnValue('subscription');
    authMock.refreshSession.mockResolvedValue({
      data: { session: { id: 's2' } },
      error: null,
    });

    const subscription = service.onAuthStateChange(() => undefined);
    const refresh = await service.refreshSession();

    expect(subscription).toBe('subscription');
    expect(refresh.data?.id).toBe('s2');
  });

  it('handles update profile exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await service.updateUserProfile('u1', { name: 'New' });
    expect(result.data).toBeNull();
  });
});
