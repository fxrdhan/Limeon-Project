import { describe, it, expect } from 'vitest';
import * as schemas from '../generated/index';

describe('generated schema index', () => {
  it('exports generated schema modules', () => {
    expect(Object.keys(schemas).length).toBeGreaterThan(0);
  });
});
