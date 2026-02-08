import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('consoleCommands', () => {
  beforeEach(() => {
    vi.resetModules();
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
});
