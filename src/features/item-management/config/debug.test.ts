import { describe, it, expect } from 'vitest';
import { DEBUG_CONFIG, HISTORY_DEBUG } from './debug';

describe('item-management debug config', () => {
  it('exposes immutable debug flags', () => {
    expect(DEBUG_CONFIG.HISTORY_DEBUG).toBe(false);
    expect(HISTORY_DEBUG).toBe(DEBUG_CONFIG.HISTORY_DEBUG);
  });
});
