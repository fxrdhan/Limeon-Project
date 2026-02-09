import { describe, expect, it } from 'vitest';
import { getContainerStyles } from './checkboxStyles';

describe('getContainerStyles', () => {
  it('returns enabled cursor classes with custom class name', () => {
    const classes = getContainerStyles(false, 'my-class');

    expect(classes).toContain('inline-flex');
    expect(classes).toContain('cursor-pointer');
    expect(classes).toContain('my-class');
  });

  it('returns disabled classes when disabled', () => {
    const classes = getContainerStyles(true);

    expect(classes).toContain('opacity-60');
    expect(classes).toContain('cursor-not-allowed');
  });
});
