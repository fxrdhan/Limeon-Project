import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  convertChangesToSegments,
  diffChars,
  type ChangeObject,
} from './jsdiff';

describe('jsdiff', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('diffs added/removed/unchanged characters', () => {
    const changes = diffChars('ABC', 'ADC');

    expect(changes.some(change => change.removed && change.value === 'B')).toBe(
      true
    );
    expect(changes.some(change => change.added && change.value === 'D')).toBe(
      true
    );
    expect(
      changes.some(change => !change.added && !change.removed && change.value)
    ).toBe(true);
  });

  it('supports ignoreCase for matching', () => {
    const changes = diffChars('AbC', 'abc', { ignoreCase: true });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      added: false,
      removed: false,
      value: 'abc',
    });
  });

  it('supports oneChangePerToken', () => {
    const changes = diffChars('abc', 'axc', { oneChangePerToken: true });
    expect(changes.length).toBeGreaterThanOrEqual(4);
    expect(
      changes.find(change => change.removed && change.value === 'b')
    ).toBeDefined();
    expect(
      changes.find(change => change.added && change.value === 'x')
    ).toBeDefined();
  });

  it('returns undefined when maxEditLength is exceeded', () => {
    const result = diffChars('abcdefghij', 'xyz', { maxEditLength: 1 });
    expect(result).toBeUndefined();
  });

  it('supports async callback mode', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const result = diffChars('abc', 'axc', { callback });
    expect(result).toBeUndefined();

    await vi.runAllTimersAsync();
    expect(callback).toHaveBeenCalledTimes(1);
    const callbackArg = callback.mock.calls[0][0] as ChangeObject<string>[];
    expect(Array.isArray(callbackArg)).toBe(true);
    expect(callbackArg.some(change => change.added || change.removed)).toBe(
      true
    );
  });

  it('converts change objects to DiffSegment format', () => {
    const changes: ChangeObject<string>[] = [
      { value: 'A', count: 1, added: false, removed: false },
      { value: 'B', count: 1, added: true, removed: false },
      { value: 'C', count: 1, added: false, removed: true },
    ];
    const segments = convertChangesToSegments(changes);

    expect(segments).toEqual([
      { type: 'unchanged', text: 'A' },
      { type: 'added', text: 'B' },
      { type: 'removed', text: 'C' },
    ]);
  });

  it('supports custom comparator and callback function shorthand', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const result = diffChars('AA', 'BB', callback);
    expect(result).toBeUndefined();

    await vi.runAllTimersAsync();
    expect(callback).toHaveBeenCalledTimes(1);

    const comparatorDiff = diffChars('A', 'B', {
      comparator: () => true,
    } as never);
    expect(comparatorDiff).toEqual([
      expect.objectContaining({ added: false, removed: false }),
    ]);
  });

  it('aborts diff when timeout is exceeded', () => {
    let now = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000;
      return now;
    });

    const result = diffChars('abcdefghij', '1234567890', { timeout: 1 });
    expect(result).toBeUndefined();

    nowSpy.mockRestore();
  });
});
