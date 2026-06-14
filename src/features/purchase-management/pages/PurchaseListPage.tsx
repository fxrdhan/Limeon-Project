import Button from '@/components/button';
import Pagination from '@/components/pagination';
import { SearchBar } from '@/components/search-bar';
import PageTitle from '@/components/page-title';
import Badge from '@/components/badge';
import DataGrid from '@/components/ag-grid/DataGrid';

import UploadInvoicePortal from '@/features/purchase-management/components/UploadInvoicePortal';
import AddPurchasePortal from '@/features/purchase-management/components/AddPurchasePortal';

import { Card } from '@/components/card';
import { Link } from 'react-router-dom';
import { useMemo, type ChangeEvent } from 'react';
import { TbEdit, TbEye, TbFileUpload, TbPlus, TbTrash } from 'react-icons/tb';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { getSearchState } from '@/utils/search';
import { formatDateOnlyDisplayValue } from '@/lib/formatters';
import {
  buildPurchaseNoRowsTemplate,
  getPurchasePaymentMethodLabel,
  getPurchaseStatusBadgeVariant,
  getPurchaseStatusLabel,
} from './purchase-list/purchaseListLabels';
import type { PurchaseListItem } from './purchase-list/types';
import { usePurchaseListPage } from './purchase-list/usePurchaseListPage';

const PurchaseList = () => {
  const {
    search,
    setSearch,
    debouncedSearch,
    currentPage,
    itemsPerPage,
    searchInputRef,
    purchases,
    totalItems,
    totalPages,
    isLoading,
    isFetching,
    showUploadPortal,
    openUploadPortal,
    closeUploadPortal,
    showAddPurchasePortal,
    openAddPurchasePortal,
    closeAddPurchasePortal,
    isAddPurchaseClosing,
    setIsAddPurchaseClosing,
    deletePurchaseMutation,
    handleDelete,
    handlePageChange,
    handleItemsPerPageChange,
  } = usePurchaseListPage();
  const columnDefs = useMemo<ColDef<PurchaseListItem>[]>(
    () => [
      {
        field: 'invoice_number',
        headerName: 'No. Faktur',
        minWidth: 140,
        flex: 1,
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
        headerName: 'Supplier',
        minWidth: 160,
        flex: 1,
        valueGetter: params =>
          params.data?.supplier?.name || 'Tidak ada supplier',
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
        field: 'payment_status',
        headerName: 'Status Pembayaran',
        minWidth: 160,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<PurchaseListItem>) => {
          const status = params.data?.payment_status;
          if (!status) return null;

          return (
            <Badge variant={getPurchaseStatusBadgeVariant(status)}>
              {getPurchaseStatusLabel(status)}
            </Badge>
          );
        },
      },
      {
        field: 'payment_method',
        headerName: 'Metode Pembayaran',
        minWidth: 160,
        cellStyle: { textAlign: 'center' },
        valueFormatter: params =>
          getPurchasePaymentMethodLabel(String(params.value)),
      },
      {
        colId: 'actions',
        headerName: 'Aksi',
        minWidth: 140,
        sortable: false,
        filter: false,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<PurchaseListItem>) => {
          const purchase = params.data;
          if (!purchase) return null;
          const isDeleting =
            deletePurchaseMutation.isPending &&
            deletePurchaseMutation.variables === purchase.id;

          return (
            <div className="flex justify-center space-x-2">
              <Link to={`/purchases/view/${purchase.id}`}>
                <Button variant="primary" size="sm">
                  <TbEye />
                </Button>
              </Link>
              <Link to={`/purchases/edit/${purchase.id}`}>
                <Button variant="secondary" size="sm">
                  <TbEdit />
                </Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(purchase)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                ) : (
                  <TbTrash />
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [
      deletePurchaseMutation.isPending,
      deletePurchaseMutation.variables,
      handleDelete,
    ]
  );
  const overlayNoRowsTemplate = buildPurchaseNoRowsTemplate(debouncedSearch);

  return (
    <>
      <Card
        className={
          isFetching ? 'opacity-75 transition-opacity duration-300' : ''
        }
      >
        <div className="mb-6">
          <PageTitle title="Daftar Pembelian" />
        </div>
        <div className="flex justify-between items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            placeholder="Cari nomor faktur..."
            className="grow"
            searchState={getSearchState(search, debouncedSearch, purchases)}
          />
          <div className="flex space-x-2 ml-4 mb-4">
            <Button variant="primary" onClick={openUploadPortal} withGlow>
              <TbFileUpload className="mr-2" />
              Upload Faktur
            </Button>
            <Button variant="primary" withGlow onClick={openAddPurchasePortal}>
              <TbPlus className="mr-2" />
              Tambah Pembelian Baru
            </Button>
          </div>
        </div>
        <DataGrid
          rowData={purchases}
          columnDefs={columnDefs}
          loading={isLoading && purchases.length === 0}
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
          itemsCount={purchases.length}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </Card>

      <UploadInvoicePortal
        isOpen={showUploadPortal}
        onClose={closeUploadPortal}
      />

      <AddPurchasePortal
        isOpen={showAddPurchasePortal}
        onClose={closeAddPurchasePortal}
        isClosing={isAddPurchaseClosing}
        setIsClosing={setIsAddPurchaseClosing}
        initialInvoiceNumber={debouncedSearch}
      />
    </>
  );
};

export default PurchaseList;
