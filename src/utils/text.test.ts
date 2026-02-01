import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { truncateText, shouldTruncateText } from './text';

describe('text utilities', () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalGetComputedStyle = window.getComputedStyle;

  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return {
          getContext: () => ({
            measureText: (text: string) => ({ width: text.length * 10 }),
          }),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      return {
        getPropertyValue: (prop: string) =>
          prop === '--font-size-base' ? '12px' : 'Inter',
      } as CSSStyleDeclaration;
    });
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    window.getComputedStyle = originalGetComputedStyle;
    vi.restoreAllMocks();
  });

  it('returns input for empty text', () => {
    expect(truncateText('', 100)).toBe('');
    expect(shouldTruncateText('', 100)).toBe(false);
  });

  it('truncates text when width exceeds limit', () => {
    const text = 'abcdefghij';
    const result = truncateText(text, 30);
    expect(result.endsWith('...')).toBe(true);
    expect(shouldTruncateText(text, 30)).toBe(true);
  });

  it('returns original text when within limit', () => {
    const text = 'abc';
    expect(truncateText(text, 100)).toBe(text);
    expect(shouldTruncateText(text, 100)).toBe(false);
  });

  it('handles missing canvas context', () => {
    (
      document.createElement as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return { getContext: () => null } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    expect(truncateText('text', 10)).toBe('text');
    expect(shouldTruncateText('text', 10)).toBe(false);
  });
});
