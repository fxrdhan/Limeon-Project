import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import FormAction from '@/components/form-action';
import ItemManagementModal from '@/features/item-management/presentation/templates/item/ItemModal';
import { CardContent, CardFooter } from '@/components/card';
import PurchaseModalHeader from '@/features/purchase-management/components/purchase-form/PurchaseModalHeader';
import PurchaseInfoSection from '@/features/purchase-management/components/purchase-form/PurchaseInfoSection';
import PurchaseItemsSection from '@/features/purchase-management/components/purchase-form/PurchaseItemsSection';
import type { ItemSearchBarRef, AddPurchasePortalProps } from '@/types';
import { usePurchaseForm } from '@/features/purchase-management/hooks/purchaseForm';
import { useItemSelection } from '@/features/item-management/application/hooks/instances/useItemSelection';
import { useItemSelectionEffect } from '@/features/purchase-management/hooks/useItemSelectionEffect';
import { usePurchaseModalAnimation } from '@/features/purchase-management/hooks/usePurchaseModalAnimation';

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

  const {
    searchItem,
    setSearchItem,
    selectedItem,
    setSelectedItem,
    filteredItems,
    getItemByID,
    refetchItems,
  } = useItemSelection({
    enabled: isOpen,
  });

  const { backdropVariants, modalVariants, contentVariants } =
    usePurchaseModalAnimation();

  const isAddNewItemDisabled = !(
    searchItem.trim() !== '' && filteredItems.length === 0
  );

  const onHandleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e);
    setIsClosing(true);
    onClose();
  };

  useItemSelectionEffect({
    selectedItem,
    addItem,
    setSelectedItem,
    setSearchItem,
    getItemByID,
  });

  useEffect(() => {
    if (isOpen && invoiceNumberInputRef.current) {
      setTimeout(() => {
        invoiceNumberInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const onHandleUnitChange = (id: string, unitName: string) => {
    handleUnitChange(id, unitName, getItemByID);
  };

  const handleCloseAddItemPortal = () => {
    setIsAddItemClosing(true);
    setTimeout(() => {
      setIsAddItemPortalOpen(false);
      setIsAddItemClosing(false);
      refetchItems();
      setTimeout(() => {
        itemSearchBarRef.current?.focus();
      }, 100);
    }, 300);
  };

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
                    setSearchItem={setSearchItem}
                    filteredItems={filteredItems}
                    selectedItem={selectedItem}
                    setSelectedItem={setSelectedItem}
                    purchaseItems={purchaseItems}
                    isAddNewItemDisabled={isAddNewItemDisabled}
                    onOpenAddItemPortal={() => {
                      setIsAddItemPortalOpen(true);
                      setPortalRenderId(prev => prev + 1);
                    }}
                    itemSearchBarRef={itemSearchBarRef}
                    formData={formData}
                    total={total}
                    getItemByID={getItemByID}
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

      <ItemManagementModal
        key={`${searchItem ?? ''}-${portalRenderId}`}
        isOpen={isAddItemPortalOpen}
        onClose={handleCloseAddItemPortal}
        initialSearchQuery={searchItem}
        isClosing={isAddItemClosing}
        setIsClosing={setIsAddItemClosing}
        refetchItems={refetchItems}
      />
    </AnimatePresence>,
    document.body
  );
};

export default AddPurchasePortal;
