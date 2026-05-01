import Button from '@/components/button';
import Pagination from '@/components/pagination';
import { SearchBar } from '@/components/search-bar';
import PageTitle from '@/components/page-title';
import Badge from '@/components/badge';
import DataGrid from '@/components/ag-grid/DataGrid';

import UploadInvoicePortal from '@/features/purchase-management/components/UploadInvoicePortal';
import { AddPurchasePortal } from '@/features/purchase-management';

import { useConfirmDialog } from '@/components/dialog-box';
import { Card } from '@/components/card';
import { Link } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TbEdit, TbEye, TbFileUpload, TbPlus, TbTrash } from 'react-icons/tb';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { getSearchState } from '@/utils/search';
import { purchasesService } from '@/services/api/purchases.service';
import { QueryKeys } from '@/constants/queryKeys';

interface Purchase {
  id: string;
  invoice_number: string;
  date: string;
  total: number;
  payment_status: string;
  payment_method: string;
  supplier: {
    name: string;
  } | null;
}

const PurchaseList = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showUploadPortal, setShowUploadPortal] = useState(false);
  const [showAddPurchasePortal, setShowAddPurchasePortal] = useState(false);
  const [isAddPurchaseClosing, setIsAddPurchaseClosing] = useState(false);
  const queryClient = useQueryClient();
  const { openConfirmDialog } = useConfirmDialog();
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: QueryKeys.purchases.paginated(
      currentPage,
      debouncedSearch,
      itemsPerPage
    ),
    queryFn: () => fetchPurchases(currentPage, debouncedSearch, itemsPerPage),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPurchases = async (
    page: number,
    searchTerm: string,
    limit: number
  ) => {
    try {
      const { data, error } = await purchasesService.getPaginatedPurchases({
        page,
        limit,
        searchTerm,
      });

      if (error || !data) {
        throw error ?? new Error('Gagal memuat data pembelian');
      }

      return data;
    } catch (error) {
      console.error('Error fetching purchases:', error);
      throw error;
    }
  };

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.purchases.all });
  }, [queryClient]);

  const purchases = useMemo(() => data?.purchases || [], [data?.purchases]);
  const totalItems = data?.totalItems || 0;

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } =
        await purchasesService.deletePurchaseWithStockRestore(id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.purchases.all });
    },
    onError: error => {
      console.error('Error deleting purchase:', error);
      alert(`Gagal menghapus pembelian: ${error.message}`);
    },
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleDelete = useCallback(
    (purchase: Purchase) => {
      openConfirmDialog({
        title: 'Konfirmasi Hapus',
        message: `Apakah Anda yakin ingin menghapus pembelian dengan nomor faktur "${purchase.invoice_number}"? Tindakan ini juga akan mengembalikan stok item yang terkait.`,
        variant: 'danger',
        confirmText: 'Hapus',
        onConfirm: () => {
          deletePurchaseMutation.mutate(purchase.id);
        },
      });
    },
    [deletePurchaseMutation, openConfirmDialog]
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'unpaid':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Lunas';
      case 'partial':
        return 'Sebagian';
      case 'unpaid':
        return 'Belum Bayar';
      default:
        return status;
    }
  };

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

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const columnDefs = useMemo<ColDef<Purchase>[]>(
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
            ? new Date(params.value).toLocaleDateString('id-ID', {
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
        cellRenderer: (params: ICellRendererParams<Purchase>) => {
          const status = params.data?.payment_status;
          if (!status) return null;

          return (
            <Badge variant={getStatusBadgeVariant(status)}>
              {getStatusLabel(status)}
            </Badge>
          );
        },
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
        minWidth: 140,
        sortable: false,
        filter: false,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<Purchase>) => {
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
  const overlayNoRowsTemplate = debouncedSearch
    ? `<span style="padding: 10px; color: oklch(55.4% 0.041 257.4);">Tidak ada pembelian dengan kata kunci "${debouncedSearch}"</span>`
    : '<span style="padding: 10px; color: oklch(55.4% 0.041 257.4);">Tidak ada data pembelian yang ditemukan</span>';

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            placeholder="Cari nomor faktur..."
            className="grow"
            searchState={getSearchState(search, debouncedSearch, purchases)}
          />
          <div className="flex space-x-2 ml-4 mb-4">
            <Button
              variant="primary"
              onClick={() => setShowUploadPortal(true)}
              withGlow
            >
              <TbFileUpload className="mr-2" />
              Upload Faktur
            </Button>
            <Button
              variant="primary"
              withGlow
              onClick={() => setShowAddPurchasePortal(true)}
            >
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
        onClose={() => setShowUploadPortal(false)}
      />

      <AddPurchasePortal
        isOpen={showAddPurchasePortal}
        onClose={() => {
          setIsAddPurchaseClosing(true);
          setTimeout(() => {
            setShowAddPurchasePortal(false);
            setIsAddPurchaseClosing(false);
            void queryClient.invalidateQueries({
              queryKey: QueryKeys.purchases.all,
            });
          }, 100);
        }}
        isClosing={isAddPurchaseClosing}
        setIsClosing={setIsAddPurchaseClosing}
        initialInvoiceNumber={debouncedSearch}
      />
    </>
  );
};

export default PurchaseList;
