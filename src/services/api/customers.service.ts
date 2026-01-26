import { BaseService } from './base.service';
import type { Customer } from '@/types/database';

export class CustomersService extends BaseService<Customer> {
  constructor() {
    super('customers');
  }

  async getActiveCustomers() {
    return this.getAll({
      orderBy: { column: 'name', ascending: true },
    });
  }
}

export const customersService = new CustomersService();
