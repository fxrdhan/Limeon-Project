import { describe, it, expect, vi, beforeEach } from 'vitest';
import authService, {
  getCurrentSession,
  signInWithEmailPassword,
  signOut,
  fetchUserById,
  updateUserProfilePhotoUrl,
  clearUserProfilePhoto,
  initializeAuth,
} from './authService';

const apiAuthMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('@/services/api/auth.service', () => ({
  authService: apiAuthMock,
}));

describe('authService facade', () => {
  beforeEach(() => {
    Object.values(apiAuthMock).forEach(fn => fn.mockReset());
  });

  it('gets current session', async () => {
    apiAuthMock.getSession.mockResolvedValue({
      data: { id: 's1' },
      error: null,
    });
    const session = await getCurrentSession();
    expect(session?.id).toBe('s1');
  });

  it('throws on session errors', async () => {
    apiAuthMock.getSession.mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });
    await expect(getCurrentSession()).rejects.toThrow('fail');
  });

  it('signs in and returns session/user', async () => {
    apiAuthMock.signInWithPassword.mockResolvedValue({
      data: { session: { id: 's1' }, user: { id: 'u1' } },
      error: null,
    });

    const result = await signInWithEmailPassword('a@b.com', 'pw');
    expect(result.session.id).toBe('s1');
  });

  it('returns null user when sign-in user missing', async () => {
    apiAuthMock.signInWithPassword.mockResolvedValue({
      data: { session: { id: 's1' }, user: null },
      error: null,
    });

    const result = await signInWithEmailPassword('a@b.com', 'pw');
    expect(result.user).toBeNull();
  });

  it('throws when sign-in fails', async () => {
    apiAuthMock.signInWithPassword.mockResolvedValue({
      data: null,
      error: new Error('bad'),
    });
    await expect(signInWithEmailPassword('a', 'b')).rejects.toThrow('bad');
  });

  it('throws when session is missing', async () => {
    apiAuthMock.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await expect(signInWithEmailPassword('a', 'b')).rejects.toThrow(
      'Authentication succeeded but session is missing'
    );
  });

  it('signs out', async () => {
    apiAuthMock.signOut.mockResolvedValue({ error: null });
    await signOut();
  });

  it('throws on sign out error', async () => {
    apiAuthMock.signOut.mockResolvedValue({ error: new Error('fail') });
    await expect(signOut()).rejects.toThrow('fail');
  });

  it('fetches user by id and handles not found', async () => {
    apiAuthMock.getUserProfile.mockResolvedValue({
      data: { id: 'u1' },
      error: null,
    });
    expect((await fetchUserById('u1'))?.id).toBe('u1');

    apiAuthMock.getUserProfile.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    expect(await fetchUserById('u2')).toBeNull();

    apiAuthMock.getUserProfile.mockResolvedValue({
      data: null,
      error: { details: 'Results contain 0 rows' },
    });
    expect(await fetchUserById('u3')).toBeNull();
  });

  it('returns null when profile data is empty', async () => {
    apiAuthMock.getUserProfile.mockResolvedValue({ data: null, error: null });
    expect(await fetchUserById('u0')).toBeNull();
  });

  it('throws on unexpected profile error', async () => {
    apiAuthMock.getUserProfile.mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });

    await expect(fetchUserById('u4')).rejects.toThrow('fail');
  });

  it('updates and clears profile photo', async () => {
    apiAuthMock.updateUserProfile.mockResolvedValue({ error: null });

    await updateUserProfilePhotoUrl('u1', 'url');
    await clearUserProfilePhoto('u1');

    expect(apiAuthMock.updateUserProfile).toHaveBeenCalled();
  });

  it('throws on update profile error', async () => {
    apiAuthMock.updateUserProfile.mockResolvedValue({
      error: new Error('fail'),
    });

    await expect(updateUserProfilePhotoUrl('u1', 'url')).rejects.toThrow(
      'fail'
    );
  });

  it('throws on clear profile error', async () => {
    apiAuthMock.updateUserProfile.mockResolvedValue({
      error: new Error('fail'),
    });
    await expect(clearUserProfilePhoto('u1')).rejects.toThrow('fail');
  });

  it('initializes auth state', async () => {
    apiAuthMock.getSession.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    apiAuthMock.getUserProfile.mockResolvedValue({
      data: { id: 'u1' },
      error: null,
    });

    const result = await initializeAuth();
    expect(result.session?.user?.id).toBe('u1');
    expect(result.user?.id).toBe('u1');

    apiAuthMock.getSession.mockResolvedValue({ data: null, error: null });
    const result2 = await initializeAuth();
    expect(result2.session).toBeNull();
  });

  it('exposes facade methods', () => {
    expect(authService.getCurrentSession).toBeDefined();
  });
});
