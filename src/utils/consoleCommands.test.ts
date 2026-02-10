import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('consoleCommands', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('initializes pharmaSys API on window', async () => {
    const { initConsoleAPI, pharmaSysConsoleAPI } =
      await import('./consoleCommands');

    initConsoleAPI();

    expect((window as Window & { pharmaSys?: unknown }).pharmaSys).toBe(
      pharmaSysConsoleAPI
    );
  });

  it('lists all localStorage entries with sizes', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { pharmaSysConsoleAPI } = await import('./consoleCommands');

    localStorage.setItem('alpha', '1234');
    localStorage.setItem('beta', 'x');

    pharmaSysConsoleAPI.storage.listAll();

    expect(logSpy).toHaveBeenCalledWith('📋 All localStorage keys:');
    expect(
      logSpy.mock.calls.some(call => String(call[0]).includes('alpha'))
    ).toBe(true);
    expect(
      logSpy.mock.calls.some(call => String(call[0]).includes('beta'))
    ).toBe(true);
    expect(
      logSpy.mock.calls.some(call => String(call[0]).includes('Total: 2 keys'))
    ).toBe(true);
  });

  it('skips null keys and auto-initializes in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const keySpy = vi
      .spyOn(Storage.prototype, 'key')
      .mockImplementation((index: number) => (index === 0 ? null : 'beta'));
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    localStorage.setItem('alpha', '1234');
    localStorage.setItem('beta', 'x');

    const { pharmaSysConsoleAPI } = await import('./consoleCommands');

    expect((window as Window & { pharmaSys?: unknown }).pharmaSys).toBe(
      pharmaSysConsoleAPI
    );

    pharmaSysConsoleAPI.storage.listAll();

    expect(
      logSpy.mock.calls.some(call => String(call[0]).includes('alpha'))
    ).toBe(false);
    expect(
      logSpy.mock.calls.some(call => String(call[0]).includes('beta'))
    ).toBe(true);
    expect(getItemSpy).toHaveBeenCalledWith('beta');

    keySpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('prints zero size for keys with null values', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    localStorage.setItem('seed', '1');
    const keySpy = vi
      .spyOn(Storage.prototype, 'key')
      .mockImplementation(() => 'ghost');
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue(null);

    const { pharmaSysConsoleAPI } = await import('./consoleCommands');
    pharmaSysConsoleAPI.storage.listAll();

    expect(
      logSpy.mock.calls.some(call => String(call[0]).includes('ghost (0 KB)'))
    ).toBe(true);

    keySpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('does nothing when window is unavailable', async () => {
    vi.stubGlobal('window', undefined);
    const { initConsoleAPI } = await import('./consoleCommands');

    expect(() => initConsoleAPI()).not.toThrow();
  });
});
