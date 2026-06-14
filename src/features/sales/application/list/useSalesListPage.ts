import { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import type { SalesListItem } from '../../domain/types';
import {
  deleteSaleWithStockRestore,
  fetchSalesListPage,
} from '../../infrastructure/salesListData';

const SALES_SEARCH_DEBOUNCE_MS = 250;

export const useSalesListPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();
  const { openConfirmDialog } = useConfirmDialog();
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as RefObject<HTMLInputElement>;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QueryKeys.sales.paginated(
      currentPage,
      debouncedSearch,
      itemsPerPage
    ),
    queryFn: () =>
      fetchSalesListPage(currentPage, debouncedSearch, itemsPerPage),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, SALES_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const sales = useMemo(() => data?.sales || [], [data?.sales]);
  const totalItems = data?.totalItems || 0;

  const deleteSaleMutation = useMutation({
    mutationFn: deleteSaleWithStockRestore,
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

  const handleItemsPerPageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(event.target.value));
      setCurrentPage(1);
    },
    []
  );

  return {
    search,
    setSearch,
    debouncedSearch,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    searchInputRef,
    sales,
    totalItems,
    totalPages: Math.ceil(totalItems / itemsPerPage),
    isLoading,
    isFetching,
    deleteSaleMutation,
    handleDelete,
    handleItemsPerPageChange,
  };
};
