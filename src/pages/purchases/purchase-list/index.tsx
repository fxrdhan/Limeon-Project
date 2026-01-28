import Button from '@/components/button';
import Pagination from '@/components/pagination';
import { SearchBar } from '@/components/search-bar';
import PageTitle from '@/components/page-title';
import Badge from '@/components/badge';

import UploadInvoicePortal from '@/pages/purchases/invoice-uploader';
import { AddPurchasePortal } from '@/features/purchase-management';

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
  PurchaseListSkeleton,
} from '@/components/table';
import { useConfirmDialog } from '@/components/dialog-box';
import { Card } from '@/components/card';
import { Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { TbEdit, TbEye, TbFileUpload, TbPlus, TbTrash } from 'react-icons/tb';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useFieldFocus } from '@/hooks/forms/fieldFocus';
import { getSearchState } from '@/utils/search';

interface Purchase {
  id: string;
  invoice_number: string;
  date: string;
  total: number;
  payment_status: string;
  payment_method: string;
  supplier: {
    name: string;
  };
}

const PurchaseList = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showUploadPortal, setShowUploadPortal] = useState(false);
  const [showAddPurchasePortal, setShowAddPurchasePortal] = useState(false);
  const [isAddPurchaseClosing, setIsAddPurchaseClosing] = useState(false);
  const [sortedPurchases, setSortedPurchases] = useState<Purchase[]>([]);
  const queryClient = useQueryClient();
  const { openConfirmDialog } = useConfirmDialog();
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;
  const location = useLocation();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['purchases', currentPage, debouncedSearch, itemsPerPage],
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

  useFieldFocus({
    searchInputRef,
    isModalOpen: showAddPurchasePortal || showUploadPortal,
    isLoading,
    isFetching,
    debouncedSearch,
    currentPage,
    itemsPerPage,
    locationKey: location.key,
  });

  const fetchPurchases = async (
    page: number,
    searchTerm: string,
    limit: number
  ) => {
    try {
      let query = supabase.from('purchases').select(`
                    id,
                    invoice_number,
                    date,
                    total,
                    payment_status,
                    payment_method,
                    supplier_id,
                    supplier:suppliers(name)
                `);

      let countQuery = supabase
        .from('purchases')
        .select('id', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('invoice_number', `%${searchTerm}%`);
        countQuery = countQuery.ilike('invoice_number', `%${searchTerm}%`);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await query
        .order('date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const transformedData =
        data?.map(item => ({
          ...item,
          supplier: Array.isArray(item.supplier)
            ? item.supplier[0]
            : item.supplier,
        })) || [];
      return { purchases: transformedData, totalItems: count || 0 };
    } catch (error) {
      console.error('Error fetching purchases:', error);
      throw error;
    }
  };

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
  }, [queryClient]);

  const purchases = useMemo(() => data?.purchases || [], [data?.purchases]);
  const totalItems = data?.totalItems || 0;

  useEffect(() => {
    setSortedPurchases(purchases);
  }, [purchases]);

  const handleSort = (sortedData: Purchase[]) => {
    setSortedPurchases(sortedData);
  };

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc(
        'delete_purchase_with_stock_restore',
        {
          p_purchase_id: id,
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
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

  const handleDelete = (purchase: Purchase) => {
    openConfirmDialog({
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus pembelian dengan nomor faktur "${purchase.invoice_number}"? Tindakan ini juga akan mengembalikan stok item yang terkait.`,
      variant: 'danger',
      confirmText: 'Hapus',
      onConfirm: () => {
        deletePurchaseMutation.mutate(purchase.id);
      },
    });
  };

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
            searchState={getSearchState(
              search,
              debouncedSearch,
              sortedPurchases
            )}
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
        {isLoading && purchases.length === 0 ? (
          <PurchaseListSkeleton rows={8} />
        ) : (
          <>
            <Table
              scrollable={true}
              stickyHeader={true}
              autoSize={true}
              columns={[
                {
                  key: 'invoice_number',
                  header: 'No. Faktur',
                  minWidth: 140,
                  sortable: true,
                },
                {
                  key: 'date',
                  header: 'Tanggal',
                  minWidth: 100,
                  sortable: true,
                },
                {
                  key: 'supplier',
                  header: 'Supplier',
                  minWidth: 120,
                  sortable: true,
                },
                {
                  key: 'total',
                  header: 'Total',
                  minWidth: 120,
                  align: 'right',
                  sortable: true,
                },
                {
                  key: 'payment_status',
                  header: 'Status Pembayaran',
                  minWidth: 140,
                  align: 'center',
                  sortable: true,
                },
                {
                  key: 'payment_method',
                  header: 'Metode Pembayaran',
                  minWidth: 140,
                  align: 'center',
                  sortable: true,
                },
                {
                  key: 'actions',
                  header: 'Aksi',
                  minWidth: 120,
                  align: 'center',
                  sortable: false,
                },
              ]}
              data={purchases}
              onSort={handleSort}
            >
              <TableHead>
                <TableRow>
                  <TableHeader>No. Faktur</TableHeader>
                  <TableHeader>Tanggal</TableHeader>
                  <TableHeader>Supplier</TableHeader>
                  <TableHeader className="text-right">Total</TableHeader>
                  <TableHeader className="text-center">
                    Status Pembayaran
                  </TableHeader>
                  <TableHeader className="text-center">
                    Metode Pembayaran
                  </TableHeader>
                  <TableHeader className="text-center">Aksi</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-slate-600"
                    >
                      {debouncedSearch
                        ? `Tidak ada pembelian dengan kata kunci "${debouncedSearch}"`
                        : 'Tidak ada data pembelian yang ditemukan'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPurchases.map(purchase => (
                    <TableRow key={purchase.id}>
                      <TableCell>{purchase.invoice_number}</TableCell>
                      <TableCell>
                        {new Date(purchase.date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {purchase.supplier?.name || 'Tidak ada supplier'}
                      </TableCell>
                      <TableCell className="text-right">
                        {purchase.total.toLocaleString('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getStatusBadgeVariant(
                            purchase.payment_status
                          )}
                        >
                          {getStatusLabel(purchase.payment_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {getPaymentMethodLabel(purchase.payment_method)}
                      </TableCell>
                      <TableCell className="text-center">
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
                            disabled={
                              deletePurchaseMutation.isPending &&
                              deletePurchaseMutation.variables === purchase.id
                            }
                          >
                            {deletePurchaseMutation.isPending &&
                            deletePurchaseMutation.variables === purchase.id ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                            ) : (
                              <TbTrash />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              itemsCount={sortedPurchases.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
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
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            setTimeout(() => {
              if (searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }, 100);
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
