import { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import { QueryKeys } from '@/constants/queryKeys';
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
import type { PurchaseListItem } from '../../domain/types';
import {
  deletePurchaseWithStockRestore,
  fetchPurchaseListPage,
} from '../../infrastructure/purchaseListData';

const PURCHASE_SEARCH_DEBOUNCE_MS = 250;
const PURCHASE_ADD_MODAL_CLOSE_MS = 200;

export const usePurchaseListPage = () => {
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
  ) as RefObject<HTMLInputElement>;
  const addPurchaseCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QueryKeys.purchases.paginated(
      currentPage,
      debouncedSearch,
      itemsPerPage
    ),
    queryFn: () =>
      fetchPurchaseListPage(currentPage, debouncedSearch, itemsPerPage),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, PURCHASE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.purchases.all });
  }, [queryClient]);

  useEffect(
    () => () => {
      if (addPurchaseCloseTimerRef.current) {
        clearTimeout(addPurchaseCloseTimerRef.current);
      }
    },
    []
  );

  const purchases = useMemo(() => data?.purchases || [], [data?.purchases]);
  const totalItems = data?.totalItems || 0;

  const deletePurchaseMutation = useMutation({
    mutationFn: deletePurchaseWithStockRestore,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.purchases.all });
    },
    onError: error => {
      console.error('Error deleting purchase:', error);
      alert(`Gagal menghapus pembelian: ${error.message}`);
    },
  });

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handleItemsPerPageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(event.target.value));
      setCurrentPage(1);
    },
    []
  );

  const handleDelete = useCallback(
    (purchase: PurchaseListItem) => {
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

  const closeAddPurchasePortal = useCallback(() => {
    setIsAddPurchaseClosing(true);
    addPurchaseCloseTimerRef.current = setTimeout(() => {
      setShowAddPurchasePortal(false);
      setIsAddPurchaseClosing(false);
      void queryClient.invalidateQueries({
        queryKey: QueryKeys.purchases.all,
      });
      addPurchaseCloseTimerRef.current = null;
    }, PURCHASE_ADD_MODAL_CLOSE_MS);
  }, [queryClient]);

  return {
    search,
    setSearch,
    debouncedSearch,
    currentPage,
    itemsPerPage,
    searchInputRef,
    purchases,
    totalItems,
    totalPages: Math.ceil(totalItems / itemsPerPage),
    isLoading,
    isFetching,
    showUploadPortal,
    openUploadPortal: () => setShowUploadPortal(true),
    closeUploadPortal: () => setShowUploadPortal(false),
    showAddPurchasePortal,
    openAddPurchasePortal: () => setShowAddPurchasePortal(true),
    closeAddPurchasePortal,
    isAddPurchaseClosing,
    setIsAddPurchaseClosing,
    deletePurchaseMutation,
    handleDelete,
    handlePageChange,
    handleItemsPerPageChange,
  };
};
