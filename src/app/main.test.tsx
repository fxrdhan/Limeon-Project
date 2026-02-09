import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('app main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('continues bootstrapping when persistence setup fails and filters React 19 ref warning', async () => {
    const renderMock = vi.fn();
    const createRootMock = vi.fn(() => ({ render: renderMock }));
    const configurePersistenceMock = vi
      .fn()
      .mockRejectedValue(new Error('persist failed'));
    const preloadCachedImagesMock = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const previousConsoleError = console.error;
    const originalErrorSpy = vi.fn();
    // Ensure module captures a controllable original error handler.
    console.error = originalErrorSpy;

    vi.doMock('react-dom/client', () => ({
      createRoot: createRootMock,
    }));
    vi.doMock('@/lib/queryPersistence', () => ({
      configurePersistence: configurePersistenceMock,
    }));
    vi.doMock('@/utils/imageCache', () => ({
      preloadCachedImages: preloadCachedImagesMock,
    }));
    vi.doMock('./App', () => ({
      default: () => null,
    }));

    await import('./main');
    await Promise.resolve();

    expect(configurePersistenceMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to configure persistence, continuing with in-memory cache:',
      expect.any(Error)
    );
    expect(preloadCachedImagesMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById('root')
    );
    expect(renderMock).toHaveBeenCalledTimes(1);

    console.error('Accessing element.ref was removed in React 19');
    expect(originalErrorSpy).not.toHaveBeenCalled();

    console.error('non-matching warning');
    expect(originalErrorSpy).toHaveBeenCalledWith('non-matching warning');

    console.error = previousConsoleError;
  });
});
