import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
} from './table';

interface SkeletonTableCellProps {
  className?: string;
  width?: string;
}

export const SkeletonTableCell = ({
  className,
  width,
}: SkeletonTableCellProps) => {
  return (
    <TableCell className={className}>
      <div
        className="animate-pulse bg-slate-200 rounded h-4"
        style={{ width: width || '100%' }}
      />
    </TableCell>
  );
};

interface SkeletonTableRowProps {
  columns: {
    width?: string;
    className?: string;
  }[];
  className?: string;
}

export const SkeletonTableRow = ({
  columns,
  className,
}: SkeletonTableRowProps) => {
  return (
    <TableRow className={className}>
      {columns.map((column, index) => (
        <SkeletonTableCell
          key={index}
          width={column.width}
          className={column.className}
        />
      ))}
    </TableRow>
  );
};

interface SkeletonTableProps {
  headers: {
    title: string;
    className?: string;
  }[];
  rows?: number;
  columns: {
    width?: string;
    className?: string;
  }[];
  className?: string;
}

export const SkeletonTable = ({
  headers,
  rows = 5,
  columns,
  className,
}: SkeletonTableProps) => {
  return (
    <Table className={className}>
      <TableHead>
        <TableRow>
          {headers.map((header, index) => (
            <TableHeader key={index} className={header.className}>
              {header.title}
            </TableHeader>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonTableRow
            key={index}
            columns={columns}
            className="hover:bg-slate-50"
          />
        ))}
      </TableBody>
    </Table>
  );
};

// Pre-configured skeleton tables for common use cases
export const ItemListSkeleton = ({ rows = 8 }: { rows?: number }) => {
  const headers = [
    { title: 'Nama Item', className: 'w-[23%]' },
    { title: 'Kode', className: 'w-[6%]' },
    { title: 'Barcode', className: 'w-[8%]' },
    { title: 'Kategori', className: 'w-[8%]' },
    { title: 'Jenis', className: 'w-[14%]' },
    { title: 'Kemasan', className: 'w-[6%]' },
    { title: 'Kemasan Turunan', className: 'w-[10%]' },
    { title: 'Harga Pokok', className: 'w-[10%] text-right' },
    { title: 'Harga Jual', className: 'w-[10%] text-right' },
    { title: 'Stok', className: 'w-[5%] text-center' },
  ];

  const columns = [
    { width: '85%', className: '' },
    { width: '60%', className: '' },
    { width: '70%', className: '' },
    { width: '80%', className: '' },
    { width: '90%', className: '' },
    { width: '70%', className: '' },
    { width: '75%', className: '' },
    { width: '80%', className: 'text-right' },
    { width: '80%', className: 'text-right' },
    { width: '50%', className: 'text-center' },
  ];

  return <SkeletonTable headers={headers} rows={rows} columns={columns} />;
};

export const CategoryListSkeleton = ({ rows = 8 }: { rows?: number }) => {
  const headers = [
    { title: 'Nama Kategori', className: 'w-[40%]' },
    { title: 'Kode', className: 'w-[20%]' },
    { title: 'Deskripsi', className: 'w-[40%]' },
  ];

  const columns = [
    { width: '85%', className: '' },
    { width: '60%', className: '' },
    { width: '90%', className: '' },
  ];

  return <SkeletonTable headers={headers} rows={rows} columns={columns} />;
};

export const UnitListSkeleton = ({ rows = 8 }: { rows?: number }) => {
  const headers = [
    { title: 'Nama Kemasan', className: 'w-[50%]' },
    { title: 'Singkatan', className: 'w-[25%]' },
    { title: 'Deskripsi', className: 'w-[25%]' },
  ];

  const columns = [
    { width: '80%', className: '' },
    { width: '50%', className: '' },
    { width: '85%', className: '' },
  ];

  return <SkeletonTable headers={headers} rows={rows} columns={columns} />;
};

export const TypeListSkeleton = ({ rows = 8 }: { rows?: number }) => {
  const headers = [
    { title: 'Nama Jenis', className: 'w-[40%]' },
    { title: 'Kode', className: 'w-[20%]' },
    { title: 'Deskripsi', className: 'w-[40%]' },
  ];

  const columns = [
    { width: '85%', className: '' },
    { width: '60%', className: '' },
    { width: '90%', className: '' },
  ];

  return <SkeletonTable headers={headers} rows={rows} columns={columns} />;
};

export const SupplierListSkeleton = ({ rows = 8 }: { rows?: number }) => {
  const headers = [
    { title: 'Nama Supplier', className: 'w-[25%]' },
    { title: 'Kontak', className: 'w-[20%]' },
    { title: 'Email', className: 'w-[20%]' },
    { title: 'Alamat', className: 'w-[35%]' },
  ];

  const columns = [
    { width: '85%', className: '' },
    { width: '70%', className: '' },
    { width: '80%', className: '' },
    { width: '90%', className: '' },
  ];

  return <SkeletonTable headers={headers} rows={rows} columns={columns} />;
};

export const PatientListSkeleton = ({ rows = 8 }: { rows?: number }) => {
  const headers = [
    { title: 'Nama Pasien', className: 'w-[25%]' },
    { title: 'No. RM', className: 'w-[15%]' },
    { title: 'Tanggal Lahir', className: 'w-[15%]' },
    { title: 'Jenis Kelamin', className: 'w-[15%]' },
    { title: 'Kontak', className: 'w-[15%]' },
    { title: 'Alamat', className: 'w-[15%]' },
  ];

  const columns = [
    { width: '85%', className: '' },
    { width: '60%', className: '' },
    { width: '70%', className: '' },
    { width: '50%', className: '' },
    { width: '70%', className: '' },
    { width: '90%', className: '' },
  ];

  return <SkeletonTable headers={headers} rows={rows} columns={columns} />;
};

export const PurchaseListSkeleton = ({ rows = 8 }: { rows?: number }) => {
  const headers = [
    { title: 'No. Invoice', className: 'w-[15%]' },
    { title: 'Supplier', className: 'w-[20%]' },
    { title: 'Tanggal', className: 'w-[15%]' },
    { title: 'Total Item', className: 'w-[10%] text-center' },
    { title: 'Total Harga', className: 'w-[15%] text-right' },
    { title: 'Status', className: 'w-[10%] text-center' },
    { title: 'Aksi', className: 'w-[15%] text-center' },
  ];

  const columns = [
    { width: '80%', className: '' },
    { width: '85%', className: '' },
    { width: '70%', className: '' },
    { width: '40%', className: 'text-center' },
    { width: '80%', className: 'text-right' },
    { width: '60%', className: 'text-center' },
    { width: '70%', className: 'text-center' },
  ];

  return <SkeletonTable headers={headers} rows={rows} columns={columns} />;
};

export default SkeletonTable;
