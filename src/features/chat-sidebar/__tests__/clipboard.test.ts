import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { copyTextToClipboard } from '../utils/clipboard';

describe('copyTextToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('uses the async clipboard API in secure contexts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await copyTextToClipboard('halo');

    expect(writeText).toHaveBeenCalledWith('halo');
  });

  it('falls back to execCommand copy when the async clipboard API is unavailable', async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    const activeElement = document.createElement('button');

    document.body.append(activeElement);
    activeElement.focus();

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await copyTextToClipboard('halo dari tablet');

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(activeElement);
  });
});
