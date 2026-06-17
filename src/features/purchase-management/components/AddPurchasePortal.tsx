import React, { Suspense, lazy, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import FormAction from '@/components/form-action';
import { CardContent, CardFooter } from '@/components/card';
import PurchaseModalHeader from '@/features/purchase-management/components/purchase-form/PurchaseModalHeader';
import PurchaseInfoSection from '@/features/purchase-management/components/purchase-form/PurchaseInfoSection';
import PurchaseItemsSection from '@/features/purchase-management/components/purchase-form/PurchaseItemsSection';
import type { ItemSearchBarRef, AddPurchasePortalProps } from '@/types';
import { useItemSelection } from '@/features/item-management/public/useItemSelection';
import { usePurchaseForm } from '@/features/purchase-management/application/form/usePurchaseForm';
import { useItemSelectionEffect } from '@/features/purchase-management/application/form/useItemSelectionEffect';
import { usePurchaseModalAnimation } from '@/features/purchase-management/components/purchase-form/usePurchaseModalAnimation';

const ItemModal = lazy(
  () => import('@/features/item-management/public/ItemModal')
);

const AddPurchasePortal: React.FC<AddPurchasePortalProps> = ({
  isOpen,
  onClose,
  isClosing,
  setIsClosing,
  initialInvoiceNumber,
}) => {
  const {
    formData,
    suppliers,
    purchaseItems,
    total,
    loading,
    handleChange,
    addItem,
    updateItem,
    handleUnitChange,
    updateItemVat,
    updateItemExpiry,
    updateItemBatchNo,
    removeItem,
    handleSubmit,
  } = usePurchaseForm({ initialInvoiceNumber, enabled: isOpen });

  const [isAddItemPortalOpen, setIsAddItemPortalOpen] = React.useState(false);
  const [isAddItemClosing, setIsAddItemClosing] = React.useState(false);
  const [portalRenderId, setPortalRenderId] = React.useState(0);

  const invoiceNumberInputRef = useRef<HTMLInputElement>(null);
  const itemSearchBarRef = useRef<ItemSearchBarRef>(null);
  const invoiceFocusTimerRef = useRef<number | null>(null);
  const closeAddItemPortalTimerRef = useRef<number | null>(null);
  const focusItemSearchTimerRef = useRef<number | null>(null);
  const submitLifecycleVersionRef = useRef(0);
  const portalStatusRef = useRef({ isOpen, isClosing });

  portalStatusRef.current = { isOpen, isClosing };

  const {
    searchItem,
    selectedItem,
    items,
    handleItemSearchChange,
    handleSelectItem,
    getItemById,
    refetchItems,
  } = useItemSelection({
    enabled: isOpen,
  });

  const { backdropVariants, modalVariants, contentVariants } =
    usePurchaseModalAnimation();

  const isAddNewItemDisabled = !(
    searchItem.trim() !== '' && items.length === 0
  );

  useEffect(() => {
    if (!isOpen || isClosing) {
      submitLifecycleVersionRef.current += 1;
    }
  }, [isClosing, isOpen]);

  const onHandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitLifecycleVersion = submitLifecycleVersionRef.current;
    const didSubmit = await handleSubmit(e);
    if (!didSubmit) return;
    if (
      submitLifecycleVersionRef.current !== submitLifecycleVersion ||
      !portalStatusRef.current.isOpen ||
      portalStatusRef.current.isClosing
    ) {
      return;
    }

    setIsClosing(true);
    onClose();
  };

  useItemSelectionEffect({
    selectedItem,
    addItem,
    onSelectItem: handleSelectItem,
    onSearchItemChange: handleItemSearchChange,
    getItemById,
  });

  const clearInvoiceFocusTimer = useCallback(() => {
    if (invoiceFocusTimerRef.current !== null) {
      window.clearTimeout(invoiceFocusTimerRef.current);
      invoiceFocusTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearInvoiceFocusTimer();

    if (!isOpen || !invoiceNumberInputRef.current) {
      return;
    }

    invoiceFocusTimerRef.current = window.setTimeout(() => {
      invoiceNumberInputRef.current?.focus();
      invoiceFocusTimerRef.current = null;
    }, 150);

    return clearInvoiceFocusTimer;
  }, [clearInvoiceFocusTimer, isOpen]);

  const onHandleUnitChange = (id: string, unitName: string) => {
    handleUnitChange(id, unitName, getItemById);
  };

  const clearAddItemPortalTimers = useCallback(() => {
    if (closeAddItemPortalTimerRef.current !== null) {
      window.clearTimeout(closeAddItemPortalTimerRef.current);
      closeAddItemPortalTimerRef.current = null;
    }

    if (focusItemSearchTimerRef.current !== null) {
      window.clearTimeout(focusItemSearchTimerRef.current);
      focusItemSearchTimerRef.current = null;
    }
  }, []);

  const handleOpenAddItemPortal = useCallback(() => {
    clearAddItemPortalTimers();
    setIsAddItemClosing(false);
    setIsAddItemPortalOpen(true);
    setPortalRenderId(prev => prev + 1);
  }, [clearAddItemPortalTimers]);

  const handleCloseAddItemPortal = useCallback(() => {
    clearAddItemPortalTimers();
    setIsAddItemClosing(true);
    closeAddItemPortalTimerRef.current = window.setTimeout(() => {
      setIsAddItemPortalOpen(false);
      setIsAddItemClosing(false);
      void refetchItems();
      closeAddItemPortalTimerRef.current = null;
      focusItemSearchTimerRef.current = window.setTimeout(() => {
        itemSearchBarRef.current?.focus();
        focusItemSearchTimerRef.current = null;
      }, 100);
    }, 200);
  }, [clearAddItemPortalTimers, refetchItems]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    clearAddItemPortalTimers();
    setIsAddItemPortalOpen(false);
    setIsAddItemClosing(false);
  }, [clearAddItemPortalTimers, isOpen]);

  useEffect(
    () => () => {
      clearAddItemPortalTimers();
      clearInvoiceFocusTimer();
    },
    [clearAddItemPortalTimers, clearInvoiceFocusTimer]
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate={isClosing ? 'exit' : 'visible'}
          exit="exit"
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50"
          onClick={e => {
            if (e.target === e.currentTarget && !isClosing) {
              setIsClosing(true);
              onClose();
            }
          }}
        >
          <motion.div
            key="modal-content"
            variants={modalVariants}
            initial="hidden"
            animate={isClosing ? 'exit' : 'visible'}
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="rounded-xl bg-white shadow-xl max-w-7xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              key="modal-header"
              variants={contentVariants}
              initial="hidden"
              animate={isClosing ? 'exit' : 'visible'}
              exit="exit"
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <PurchaseModalHeader
                title="Tambah Pembelian Baru"
                onClose={onClose}
                isClosing={isClosing}
                setIsClosing={setIsClosing}
              />
            </motion.div>

            <motion.form
              key="modal-form"
              variants={contentVariants}
              initial="hidden"
              animate={isClosing ? 'exit' : 'visible'}
              exit="exit"
              transition={{ duration: 0.2, delay: 0.1 }}
              onSubmit={onHandleSubmit}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-6 py-1">
                <CardContent className="space-y-6">
                  <PurchaseInfoSection
                    formData={formData}
                    suppliers={suppliers}
                    invoiceNumberInputRef={invoiceNumberInputRef}
                    handleChange={handleChange}
                  />

                  <PurchaseItemsSection
                    searchItem={searchItem}
                    onSearchItemChange={handleItemSearchChange}
                    items={items}
                    selectedItem={selectedItem}
                    onSelectItem={handleSelectItem}
                    purchaseItems={purchaseItems}
                    isAddNewItemDisabled={isAddNewItemDisabled}
                    onOpenAddItemPortal={handleOpenAddItemPortal}
                    itemSearchBarRef={itemSearchBarRef}
                    formData={formData}
                    total={total}
                    getItemById={getItemById}
                    updateItem={updateItem}
                    updateItemVat={updateItemVat}
                    onHandleUnitChange={onHandleUnitChange}
                    updateItemBatchNo={updateItemBatchNo}
                    updateItemExpiry={updateItemExpiry}
                    removeItem={removeItem}
                    handleChange={handleChange}
                  />
                </CardContent>
              </div>

              <CardFooter className="sticky bottom-0 z-10 py-6! px-6!">
                <FormAction
                  onCancel={() => {
                    setIsClosing(true);
                    onClose();
                  }}
                  isSaving={loading}
                  isDisabled={purchaseItems.length === 0}
                />
              </CardFooter>
            </motion.form>
          </motion.div>
        </motion.div>
      )}

      {isAddItemPortalOpen ? (
        <Suspense fallback={null}>
          <ItemModal
            key={`${searchItem ?? ''}-${portalRenderId}`}
            isOpen={isAddItemPortalOpen}
            onClose={handleCloseAddItemPortal}
            initialSearchQuery={searchItem}
            isClosing={isAddItemClosing}
            setIsClosing={setIsAddItemClosing}
            refetchItems={refetchItems}
          />
        </Suspense>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

export default AddPurchasePortal;
