import Button from '@/components/button';
import Pagination from '@/components/pagination';
import { SearchBar } from '@/components/search-bar';
import PageTitle from '@/components/page-title';
import DataGrid from '@/components/ag-grid/DataGrid';
import { Card } from '@/components/card';
import { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { formatDateOnlyDisplayValue } from '@/lib/formatters';
import { salesService, type SalesListItem } from '@/services/api/sales.service';
import { getSearchState } from '@/utils/search';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbPlus, TbTrash } from 'react-icons/tb';

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash':
      return 'Tunai';
    case 'transfer':
      return 'Transfer';
    case 'credit':
      return 'Kredit';
    default:
      return method;
  }
};

const getBuyerName = (sale: SalesListItem) =>
  sale.customer?.name || sale.patient?.name || 'Umum';

const SalesListPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();
  const { openConfirmDialog } = useConfirmDialog();
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QueryKeys.sales.paginated(
      currentPage,
      debouncedSearch,
      itemsPerPage
    ),
    queryFn: () => fetchSales(currentPage, debouncedSearch, itemsPerPage),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const fetchSales = async (
    page: number,
    searchTerm: string,
    limit: number
  ) => {
    const { data, error } = await salesService.getPaginatedSales({
      page,
      limit,
      searchTerm,
    });

    if (error || !data) {
      throw error ?? new Error('Gagal memuat data penjualan');
    }

    return data;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const sales = useMemo(() => data?.sales || [], [data?.sales]);
  const totalItems = data?.totalItems || 0;

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await salesService.deleteSaleWithStockRestore(id);
      if (error) throw error;
    },
    onSuccess: () => {
      for (const queryKey of getInvalidationKeys.sales.related()) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: error => {
      console.error('Error deleting sale:', error);
      alert(`Gagal menghapus penjualan: ${error.message}`);
    },
  });

  const handleDelete = useCallback(
    (sale: SalesListItem) => {
      const invoiceLabel = sale.invoice_number || sale.id.slice(0, 8);

      openConfirmDialog({
        title: 'Konfirmasi Hapus',
        message: `Apakah Anda yakin ingin menghapus penjualan "${invoiceLabel}"? Tindakan ini juga akan mengembalikan stok item yang terkait.`,
        variant: 'danger',
        confirmText: 'Hapus',
        onConfirm: () => {
          deleteSaleMutation.mutate(sale.id);
        },
      });
    },
    [deleteSaleMutation, openConfirmDialog]
  );

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const columnDefs = useMemo<ColDef<SalesListItem>[]>(
    () => [
      {
        field: 'invoice_number',
        headerName: 'No. Faktur',
        minWidth: 140,
        flex: 1,
        valueFormatter: params => String(params.value || '-'),
      },
      {
        field: 'date',
        headerName: 'Tanggal',
        minWidth: 120,
        valueFormatter: params =>
          params.value
            ? formatDateOnlyDisplayValue(String(params.value), {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '',
      },
      {
        headerName: 'Pelanggan/Pasien',
        minWidth: 180,
        flex: 1,
        valueGetter: params =>
          params.data ? getBuyerName(params.data) : 'Umum',
      },
      {
        headerName: 'Dokter',
        minWidth: 160,
        flex: 1,
        valueGetter: params => params.data?.doctor?.name || '-',
      },
      {
        field: 'total',
        headerName: 'Total',
        minWidth: 140,
        cellStyle: { textAlign: 'right' },
        valueFormatter: params =>
          Number(params.value ?? 0).toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
          }),
      },
      {
        field: 'payment_method',
        headerName: 'Metode Pembayaran',
        minWidth: 160,
        cellStyle: { textAlign: 'center' },
        valueFormatter: params => getPaymentMethodLabel(String(params.value)),
      },
      {
        colId: 'actions',
        headerName: 'Aksi',
        minWidth: 90,
        sortable: false,
        filter: false,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<SalesListItem>) => {
          const sale = params.data;
          if (!sale) return null;
          const isDeleting =
            deleteSaleMutation.isPending &&
            deleteSaleMutation.variables === sale.id;

          return (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(sale)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              ) : (
                <TbTrash />
              )}
            </Button>
          );
        },
      },
    ],
    [deleteSaleMutation.isPending, deleteSaleMutation.variables, handleDelete]
  );

  const overlayNoRowsTemplate = debouncedSearch
    ? `<span style="padding: 10px; color: oklch(55.4% 0.041 257.4);">Tidak ada penjualan dengan kata kunci "${debouncedSearch}"</span>`
    : '<span style="padding: 10px; color: oklch(55.4% 0.041 257.4);">Tidak ada data penjualan yang ditemukan</span>';

  return (
    <Card
      className={isFetching ? 'opacity-75 transition-opacity duration-300' : ''}
    >
      <div className="mb-6">
        <PageTitle title="Daftar Penjualan" />
      </div>
      <div className="flex items-center justify-between">
        <SearchBar
          inputRef={searchInputRef}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          placeholder="Cari nomor faktur..."
          className="grow"
          searchState={getSearchState(search, debouncedSearch, sales)}
        />
        <div className="ml-4 mb-4 flex space-x-2">
          <Link to="/sales/create">
            <Button variant="primary" withGlow>
              <TbPlus className="mr-2" />
              Tambah Penjualan
            </Button>
          </Link>
        </div>
      </div>
      <DataGrid
        rowData={sales}
        columnDefs={columnDefs}
        loading={isLoading && sales.length === 0}
        overlayNoRowsTemplate={overlayNoRowsTemplate}
        domLayout="normal"
        disableFiltering={true}
        suppressMovableColumns={true}
        style={{
          width: '100%',
          height: 430,
          marginTop: '1rem',
          marginBottom: '1rem',
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemsCount={sales.length}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </Card>
  );
};

export default SalesListPage;
