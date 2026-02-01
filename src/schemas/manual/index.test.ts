import { describe, it, expect } from 'vitest';
import * as schemas from './index';

describe('manual schemas index', () => {
  it('re-exports manual schemas', () => {
    expect(schemas.itemNameSchema).toBeDefined();
    expect(schemas.itemSchema).toBeDefined();
  });
});
