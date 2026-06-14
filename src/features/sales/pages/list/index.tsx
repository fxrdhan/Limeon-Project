import Button from '@/components/button';
import Pagination from '@/components/pagination';
import { SearchBar } from '@/components/search-bar';
import PageTitle from '@/components/page-title';
import DataGrid from '@/components/ag-grid/DataGrid';
import { Card } from '@/components/card';
import { formatDateOnlyDisplayValue } from '@/lib/formatters';
import { getSearchState } from '@/utils/search';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { useMemo, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { TbPlus, TbTrash } from 'react-icons/tb';
import {
  buildSalesNoRowsTemplate,
  getSalesBuyerName,
  getSalesPaymentMethodLabel,
} from '../../domain/salesListLabels';
import type { SalesListItem } from '../../domain/types';
import { useSalesListPage } from '../../application/list/useSalesListPage';

const SalesListPage = () => {
  const {
    search,
    setSearch,
    debouncedSearch,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    searchInputRef,
    sales,
    totalItems,
    totalPages,
    isLoading,
    isFetching,
    deleteSaleMutation,
    handleDelete,
    handleItemsPerPageChange,
  } = useSalesListPage();

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
          params.data ? getSalesBuyerName(params.data) : 'Umum',
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
        valueFormatter: params =>
          getSalesPaymentMethodLabel(String(params.value)),
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

  const overlayNoRowsTemplate = buildSalesNoRowsTemplate(debouncedSearch);

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
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
