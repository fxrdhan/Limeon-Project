import { lazy, Suspense } from 'react';
import type { useConfirmDialog } from '@/components/dialog-box';
import type { useItemsManagement } from '@/hooks/data/useItemsManagement';
import type { useEntityManager } from '@/features/item-management/application/hooks/collections';
import type { EntityData } from '@/features/item-management/application/hooks/collections/useEntityManager';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  Patient as PatientType,
} from '@/types';
import { IdentityMasterDataModals } from './IdentityMasterDataModals';
import type { useIdentityMasterDataTabs } from '../hooks/useIdentityMasterDataTabs';
import type { useItemModalState } from '../hooks/useItemModalState';
import type { useSupplierTab } from '../hooks/useSupplierTab';

const ItemModal = lazy(
  () =>
    import('@/features/item-management/presentation/templates/item/ItemModal')
);
const EntityModal = lazy(
  () =>
    import('@/features/item-management/presentation/templates/entity/EntityModal')
);
const SupplierModals = lazy(() => import('./SupplierModals'));

interface ItemMasterModalStackProps {
  activeTab: string;
  entityCurrentConfig: { entityName?: string } | null;
  entityManager: ReturnType<typeof useEntityManager>;
  identityTabs: ReturnType<typeof useIdentityMasterDataTabs>;
  isCustomerTab: boolean;
  isDoctorTab: boolean;
  isItemEntityTab: boolean;
  isPatientTab: boolean;
  isSupplierTab: boolean;
  itemModalState: ReturnType<typeof useItemModalState>;
  itemsManagement: Pick<ReturnType<typeof useItemsManagement>, 'refetchItems'>;
  openConfirmDialog: ReturnType<typeof useConfirmDialog>['openConfirmDialog'];
  supplierSearch: string;
  supplierTab: ReturnType<typeof useSupplierTab>;
}

export const ItemMasterModalStack = ({
  activeTab,
  entityCurrentConfig,
  entityManager,
  identityTabs,
  isCustomerTab,
  isDoctorTab,
  isItemEntityTab,
  isPatientTab,
  isSupplierTab,
  itemModalState,
  itemsManagement,
  openConfirmDialog,
  supplierSearch,
  supplierTab,
}: ItemMasterModalStackProps) => {
  const {
    close: closeAddItemModal,
    currentSearchQuery: currentSearchQueryForModal,
    editingItemData,
    editingItemId,
    isClosing: isItemModalClosing,
    isOpen: isAddItemModalOpen,
    renderId: modalRenderId,
    setIsClosing: setIsItemModalClosing,
  } = itemModalState;
  const {
    closeAddSupplierModal,
    closeEditSupplierModal,
    editingSupplier,
    isAddSupplierModalOpen,
    isEditSupplierModalOpen,
    supplierFields,
    supplierMutations,
  } = supplierTab;
  const {
    customerDebouncedSearch,
    customerFields,
    defaultCustomerLevelId,
    doctorDebouncedSearch,
    doctorFields,
    editingCustomer,
    editingDoctor,
    editingPatient,
    handleCustomerDelete,
    handleCustomerFieldAutosave,
    handleCustomerModalSubmit,
    handleDoctorDelete,
    handleDoctorFieldAutosave,
    handleDoctorImageDelete,
    handleDoctorImageSave,
    handleDoctorModalSubmit,
    handlePatientDelete,
    handlePatientFieldAutosave,
    handlePatientImageDelete,
    handlePatientImageSave,
    handlePatientModalSubmit,
    isAddCustomerModalOpen,
    isAddDoctorModalOpen,
    isAddPatientModalOpen,
    isEditCustomerModalOpen,
    isEditDoctorModalOpen,
    isEditPatientModalOpen,
    patientDebouncedSearch,
    patientFields,
    setIsAddCustomerModalOpen,
    setIsAddDoctorModalOpen,
    setIsAddPatientModalOpen,
    setIsEditCustomerModalOpen,
    setIsEditDoctorModalOpen,
    setIsEditPatientModalOpen,
    toCustomerPayload,
    toDoctorPayload,
    toPatientPayload,
  } = identityTabs;

  return (
    <>
      {activeTab === 'items' && (isAddItemModalOpen || isItemModalClosing) && (
        <Suspense fallback={null}>
          <ItemModal
            key={`${editingItemId ?? 'new'}-${currentSearchQueryForModal ?? ''}-${modalRenderId}`}
            isOpen={isAddItemModalOpen}
            onClose={closeAddItemModal}
            itemId={editingItemId}
            initialItemData={editingItemData}
            initialSearchQuery={currentSearchQueryForModal}
            isClosing={isItemModalClosing}
            setIsClosing={setIsItemModalClosing}
            refetchItems={itemsManagement.refetchItems}
          />
        </Suspense>
      )}

      {isItemEntityTab &&
        (entityManager.isAddModalOpen || entityManager.isEditModalOpen) && (
          <Suspense fallback={null}>
            <EntityModal
              isOpen={true}
              onClose={
                entityManager.isEditModalOpen
                  ? entityManager.closeEditModal
                  : entityManager.closeAddModal
              }
              onSubmit={entityManager.handleSubmit}
              initialData={entityManager.editingEntity}
              onDelete={
                entityManager.editingEntity
                  ? () =>
                      entityManager.handleDelete(
                        entityManager.editingEntity as EntityData
                      )
                  : undefined
              }
              isLoading={false}
              isDeleting={false}
              entityName={entityCurrentConfig?.entityName || 'Entity'}
            />
          </Suspense>
        )}

      {(isSupplierTab || isAddSupplierModalOpen || isEditSupplierModalOpen) && (
        <Suspense fallback={null}>
          <SupplierModals
            isActive={isSupplierTab}
            supplierFields={supplierFields}
            supplierSearch={supplierSearch}
            isAddSupplierModalOpen={isAddSupplierModalOpen}
            isEditSupplierModalOpen={isEditSupplierModalOpen}
            editingSupplier={editingSupplier}
            supplierMutations={supplierMutations}
            openConfirmDialog={openConfirmDialog}
            closeAddSupplierModal={closeAddSupplierModal}
            closeEditSupplierModal={closeEditSupplierModal}
          />
        </Suspense>
      )}

      <IdentityMasterDataModals
        isCustomerTab={isCustomerTab}
        isPatientTab={isPatientTab}
        isDoctorTab={isDoctorTab}
        isAddCustomerModalOpen={isAddCustomerModalOpen}
        isEditCustomerModalOpen={isEditCustomerModalOpen}
        isAddPatientModalOpen={isAddPatientModalOpen}
        isEditPatientModalOpen={isEditPatientModalOpen}
        isAddDoctorModalOpen={isAddDoctorModalOpen}
        isEditDoctorModalOpen={isEditDoctorModalOpen}
        defaultCustomerLevelId={defaultCustomerLevelId}
        customerFields={customerFields}
        patientFields={patientFields}
        doctorFields={doctorFields}
        editingCustomer={editingCustomer as CustomerType | null}
        editingPatient={editingPatient as PatientType | null}
        editingDoctor={editingDoctor as DoctorType | null}
        customerDebouncedSearch={customerDebouncedSearch}
        patientDebouncedSearch={patientDebouncedSearch}
        doctorDebouncedSearch={doctorDebouncedSearch}
        setIsAddCustomerModalOpen={setIsAddCustomerModalOpen}
        setIsEditCustomerModalOpen={setIsEditCustomerModalOpen}
        setIsAddPatientModalOpen={setIsAddPatientModalOpen}
        setIsEditPatientModalOpen={setIsEditPatientModalOpen}
        setIsAddDoctorModalOpen={setIsAddDoctorModalOpen}
        setIsEditDoctorModalOpen={setIsEditDoctorModalOpen}
        toCustomerPayload={toCustomerPayload}
        toPatientPayload={toPatientPayload}
        toDoctorPayload={toDoctorPayload}
        handleCustomerModalSubmit={handleCustomerModalSubmit}
        handlePatientModalSubmit={handlePatientModalSubmit}
        handleDoctorModalSubmit={handleDoctorModalSubmit}
        handleCustomerFieldAutosave={handleCustomerFieldAutosave}
        handlePatientFieldAutosave={handlePatientFieldAutosave}
        handleDoctorFieldAutosave={handleDoctorFieldAutosave}
        handleCustomerDelete={handleCustomerDelete}
        handlePatientDelete={handlePatientDelete}
        handleDoctorDelete={handleDoctorDelete}
        handlePatientImageSave={handlePatientImageSave}
        handleDoctorImageSave={handleDoctorImageSave}
        handlePatientImageDelete={handlePatientImageDelete}
        handleDoctorImageDelete={handleDoctorImageDelete}
        openConfirmDialog={openConfirmDialog}
      />
    </>
  );
};
