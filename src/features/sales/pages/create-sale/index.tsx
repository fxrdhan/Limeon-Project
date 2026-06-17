import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Card, CardContent, CardFooter } from '@/components/card';
import FormAction from '@/components/form-action';
import PageTitle from '@/components/page-title';
import SaleInfoSection from '@/features/sales/components/SaleInfoSection';
import SaleItemsSection from '@/features/sales/components/SaleItemsSection';
import { useItemSelection } from '@/features/item-management/public/useItemSelection';
import type { ItemSearchBarRef } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useSaleForm } from '../../application/create-sale/useSaleForm';
import { useSaleItemSelectionEffect } from '../../application/create-sale/useSaleItemSelectionEffect';

const ItemModal = lazy(
  () => import('@/features/item-management/public/ItemModal')
);

const CreateSalePage: React.FC = () => {
  const navigate = useNavigate();
  const [isAddItemPortalOpen, setIsAddItemPortalOpen] = useState(false);
  const [isAddItemClosing, setIsAddItemClosing] = useState(false);
  const [portalRenderId, setPortalRenderId] = useState(0);
  const itemSearchBarRef = useRef<ItemSearchBarRef>(null);
  const closeAddItemPortalTimerRef = useRef<number | null>(null);
  const focusItemSearchTimerRef = useRef<number | null>(null);

  const {
    formData,
    customers,
    patients,
    doctors,
    saleItems,
    total,
    loading,
    handleChange,
    addItem,
    updateItem,
    handleUnitChange,
    removeItem,
    handleSubmit,
  } = useSaleForm();

  const {
    searchItem,
    selectedItem,
    items,
    handleItemSearchChange,
    handleSelectItem,
    getItemById,
    refetchItems,
  } = useItemSelection();

  const isAddNewItemDisabled = !(
    searchItem.trim() !== '' && items.length === 0
  );

  useSaleItemSelectionEffect({
    selectedItem,
    addItem,
    onSelectItem: handleSelectItem,
    onSearchItemChange: handleItemSearchChange,
    getItemById,
  });

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

  const handleOpenAddItemPortal = () => {
    clearAddItemPortalTimers();
    setIsAddItemClosing(false);
    setIsAddItemPortalOpen(true);
    setPortalRenderId(prev => prev + 1);
  };

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

  useEffect(() => clearAddItemPortalTimers, [clearAddItemPortalTimers]);

  return (
    <>
      <Card>
        <div className="mb-6">
          <PageTitle title="Tambah Penjualan" />
        </div>

        <form
          onSubmit={event => void handleSubmit(event, getItemById)}
          className="flex flex-col"
        >
          <CardContent className="space-y-6">
            <SaleInfoSection
              formData={formData}
              customers={customers}
              patients={patients}
              doctors={doctors}
              handleChange={handleChange}
            />

            <SaleItemsSection
              searchItem={searchItem}
              onSearchItemChange={handleItemSearchChange}
              items={items}
              selectedItem={selectedItem}
              onSelectItem={handleSelectItem}
              saleItems={saleItems}
              isAddNewItemDisabled={isAddNewItemDisabled}
              onOpenAddItemPortal={handleOpenAddItemPortal}
              itemSearchBarRef={itemSearchBarRef}
              total={total}
              getItemById={getItemById}
              updateItem={updateItem}
              onHandleUnitChange={onHandleUnitChange}
              removeItem={removeItem}
            />
          </CardContent>

          <CardFooter className="mt-6">
            <FormAction
              onCancel={() => navigate('/sales')}
              isSaving={loading}
              isDisabled={saleItems.length === 0}
            />
          </CardFooter>
        </form>
      </Card>

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
    </>
  );
};

export default CreateSalePage;
