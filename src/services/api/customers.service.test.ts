import { describe, it, expect, vi } from 'vitest';
import { customersService } from './customers.service';
import { BaseService } from './base.service';

describe('CustomersService', () => {
  it('fetches active customers ordered by name', async () => {
    const getAllSpy = vi
      .spyOn(BaseService.prototype, 'getAll')
      .mockResolvedValue({ data: [], error: null });

    await customersService.getActiveCustomers();

    expect(getAllSpy).toHaveBeenCalledWith({
      orderBy: { column: 'name', ascending: true },
    });
  });
});
