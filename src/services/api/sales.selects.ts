export const SALES_LIST_SELECT = `
  id,
  invoice_number,
  date,
  total,
  payment_method,
  patient:patients(id, name, phone),
  doctor:doctors(id, name, specialization),
  customer:customers(id, name, phone)
`;

export const SALE_DETAILS_SELECT = `
  *,
  patients (
    id,
    name,
    phone
  ),
  doctors (
    id,
    name,
    specialization
  ),
  customers (
    id,
    name,
    phone
  ),
  users!sales_created_by_fkey (
    id,
    name
  )
`;

export const SALES_DATE_RANGE_SELECT = `
  *,
  patients (
    id,
    name,
    phone
  ),
  doctors (
    id,
    name,
    specialization
  )
`;
