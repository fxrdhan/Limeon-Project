import { describe, expect, it } from 'vitest';
import config, { config as namedConfig } from './index';

describe('config', () => {
  it('exports stable development flags from default and named export', () => {
    expect(config).toEqual({
      toast_tester_enabled: false,
      random_item_generator_enabled: true,
    });
    expect(namedConfig).toBe(config);
  });
});
