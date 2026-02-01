import { describe, it, expect } from 'vitest';
import * as domain from './index';

describe('item-management domain index', () => {
  it('re-exports use cases', () => {
    expect(domain.calculateItemPrice).toBeTypeOf('function');
    expect(domain.validateCreateItemInput).toBeTypeOf('function');
    expect(domain.validateUpdateItemInput).toBeTypeOf('function');
  });
});
