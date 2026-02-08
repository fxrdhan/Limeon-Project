import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/identity/IdentityDataModal', () => ({
  default: 'MockIdentityDataModal',
}));

import IdentityDataModal from './IdentityDataModal';

describe('components/IdentityDataModal', () => {
  it('re-exports feature IdentityDataModal as default', () => {
    expect(IdentityDataModal).toBe('MockIdentityDataModal');
  });
});
