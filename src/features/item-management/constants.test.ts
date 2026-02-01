import { describe, it, expect } from 'vitest';
import {
  CACHE_KEY,
  DEFAULT_MIN_STOCK,
  ITEM_FORM_STATES,
  ITEM_MODAL_TYPES,
} from './constants';

describe('item-management constants', () => {
  it('defines cache key and defaults', () => {
    expect(CACHE_KEY).toBe('addItemFormCache');
    expect(DEFAULT_MIN_STOCK).toBe(10);
  });

  it('exposes form states and modal types', () => {
    expect(ITEM_FORM_STATES).toEqual({
      LOADING: 'loading',
      SAVING: 'saving',
      IDLE: 'idle',
    });

    expect(ITEM_MODAL_TYPES).toEqual({
      ADD_CATEGORY: 'addCategory',
      ADD_TYPE: 'addType',
      ADD_UNIT: 'addUnit',
    });
  });
});
