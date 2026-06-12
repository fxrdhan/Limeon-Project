import type { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  FieldConfig,
  GenericIdentityModalProps,
  Patient as PatientType,
} from '@/types';
import { lazy, Suspense, useMemo } from 'react';

const IdentityDataModal = lazy(
  () => import('@/components/identity-data-modal')
);

type IdentityFormData = Record<string, string | number | boolean | null>;
type IdentityPayload = Record<string, unknown>;
type OpenConfirmDialog = ReturnType<
  typeof useConfirmDialog
>['openConfirmDialog'];

const isIdentityFormValue = (
  value: unknown
): value is string | number | boolean | null => {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
};

interface IdentityMasterDataModalsProps {
  isCustomerTab: boolean;
  isPatientTab: boolean;
  isDoctorTab: boolean;
  isAddCustomerModalOpen: boolean;
  isEditCustomerModalOpen: boolean;
  isAddPatientModalOpen: boolean;
  isEditPatientModalOpen: boolean;
  isAddDoctorModalOpen: boolean;
  isEditDoctorModalOpen: boolean;
  defaultCustomerLevelId: string | null;
  customerFields: FieldConfig[];
  patientFields: FieldConfig[];
  doctorFields: FieldConfig[];
  editingCustomer?: CustomerType | null;
  editingPatient?: PatientType | null;
  editingDoctor?: DoctorType | null;
  customerDebouncedSearch: string;
  patientDebouncedSearch: string;
  doctorDebouncedSearch: string;
  setIsAddCustomerModalOpen: (isOpen: boolean) => void;
  setIsEditCustomerModalOpen: (isOpen: boolean) => void;
  setIsAddPatientModalOpen: (isOpen: boolean) => void;
  setIsEditPatientModalOpen: (isOpen: boolean) => void;
  setIsAddDoctorModalOpen: (isOpen: boolean) => void;
  setIsEditDoctorModalOpen: (isOpen: boolean) => void;
  toCustomerPayload: (data: IdentityFormData) => IdentityPayload;
  toPatientPayload: (data: IdentityFormData) => IdentityPayload;
  toDoctorPayload: (data: IdentityFormData) => IdentityPayload;
  handleCustomerModalSubmit: (input: {
    id?: string;
    data: IdentityPayload;
  }) => Promise<unknown>;
  handlePatientModalSubmit: (input: {
    id?: string;
    data: IdentityPayload;
  }) => Promise<unknown>;
  handleDoctorModalSubmit: (input: {
    id?: string;
    data: IdentityPayload;
  }) => Promise<unknown>;
  handleCustomerFieldAutosave: (
    id: string | undefined,
    key: string,
    value: unknown
  ) => Promise<void>;
  handlePatientFieldAutosave: (
    id: string | undefined,
    key: string,
    value: unknown
  ) => Promise<void>;
  handleDoctorFieldAutosave: (
    id: string | undefined,
    key: string,
    value: unknown
  ) => Promise<void>;
  handleCustomerDelete: (id: string) => unknown;
  handlePatientDelete: (id: string) => unknown;
  handleDoctorDelete: (id: string) => unknown;
  handlePatientImageSave: NonNullable<GenericIdentityModalProps['onImageSave']>;
  handleDoctorImageSave: NonNullable<GenericIdentityModalProps['onImageSave']>;
  handlePatientImageDelete: NonNullable<
    GenericIdentityModalProps['onImageDelete']
  >;
  handleDoctorImageDelete: NonNullable<
    GenericIdentityModalProps['onImageDelete']
  >;
  openConfirmDialog: OpenConfirmDialog;
}

const toModalData = (
  value: CustomerType | PatientType | DoctorType | null | undefined
): IdentityFormData => {
  if (!value) return {};

  const modalData: IdentityFormData = {};
  Object.entries(value).forEach(([key, fieldValue]) => {
    if (isIdentityFormValue(fieldValue)) {
      modalData[key] = fieldValue;
    }
  });
  return modalData;
};

const buildDeleteRequest = ({
  entityName,
  label,
  onDelete,
  openConfirmDialog,
}: {
  entityName: string;
  label: string;
  onDelete: () => unknown;
  openConfirmDialog: OpenConfirmDialog;
}) => {
  return () => {
    openConfirmDialog({
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus ${entityName} "${label}"?`,
      variant: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        await onDelete();
      },
    });
  };
};

export const IdentityMasterDataModals = ({
  isCustomerTab,
  isPatientTab,
  isDoctorTab,
  isAddCustomerModalOpen,
  isEditCustomerModalOpen,
  isAddPatientModalOpen,
  isEditPatientModalOpen,
  isAddDoctorModalOpen,
  isEditDoctorModalOpen,
  defaultCustomerLevelId,
  customerFields,
  patientFields,
  doctorFields,
  editingCustomer,
  editingPatient,
  editingDoctor,
  customerDebouncedSearch,
  patientDebouncedSearch,
  doctorDebouncedSearch,
  setIsAddCustomerModalOpen,
  setIsEditCustomerModalOpen,
  setIsAddPatientModalOpen,
  setIsEditPatientModalOpen,
  setIsAddDoctorModalOpen,
  setIsEditDoctorModalOpen,
  toCustomerPayload,
  toPatientPayload,
  toDoctorPayload,
  handleCustomerModalSubmit,
  handlePatientModalSubmit,
  handleDoctorModalSubmit,
  handleCustomerFieldAutosave,
  handlePatientFieldAutosave,
  handleDoctorFieldAutosave,
  handleCustomerDelete,
  handlePatientDelete,
  handleDoctorDelete,
  handlePatientImageSave,
  handleDoctorImageSave,
  handlePatientImageDelete,
  handleDoctorImageDelete,
  openConfirmDialog,
}: IdentityMasterDataModalsProps) => {
  const customerModalData = useMemo(
    () => toModalData(editingCustomer),
    [editingCustomer]
  );
  const patientModalData = useMemo(
    () => toModalData(editingPatient),
    [editingPatient]
  );
  const doctorModalData = useMemo(
    () => toModalData(editingDoctor),
    [editingDoctor]
  );

  return (
    <>
      {isCustomerTab && isAddCustomerModalOpen ? (
        <Suspense fallback={null}>
          <IdentityDataModal
            title="Tambah Pelanggan Baru"
            data={{ customer_level_id: defaultCustomerLevelId }}
            fields={customerFields}
            isOpen={isCustomerTab && isAddCustomerModalOpen}
            onClose={() => setIsAddCustomerModalOpen(false)}
            onSave={async data =>
              await handleCustomerModalSubmit({
                data: toCustomerPayload(data),
              })
            }
            mode="add"
            initialNameFromSearch={customerDebouncedSearch}
            showImageUploader={false}
            useInlineFieldActions={false}
          />
        </Suspense>
      ) : null}

      {isCustomerTab && isEditCustomerModalOpen ? (
        <Suspense fallback={null}>
          <IdentityDataModal
            title="Edit Pelanggan"
            data={customerModalData}
            fields={customerFields}
            isOpen={isCustomerTab && isEditCustomerModalOpen}
            onClose={() => setIsEditCustomerModalOpen(false)}
            onSave={async data =>
              await handleCustomerModalSubmit({
                id: editingCustomer?.id,
                data: toCustomerPayload(data),
              })
            }
            onFieldSave={async (key, value) => {
              await handleCustomerFieldAutosave(
                editingCustomer?.id,
                key,
                value
              );
            }}
            onDeleteRequest={
              editingCustomer
                ? buildDeleteRequest({
                    entityName: 'pelanggan',
                    label: editingCustomer.name,
                    onDelete: async () => {
                      await handleCustomerDelete(editingCustomer.id);
                    },
                    openConfirmDialog,
                  })
                : undefined
            }
            mode="edit"
            showImageUploader={false}
            useInlineFieldActions={false}
          />
        </Suspense>
      ) : null}

      {isPatientTab && isAddPatientModalOpen ? (
        <Suspense fallback={null}>
          <IdentityDataModal
            title="Tambah Pasien Baru"
            data={{}}
            fields={patientFields}
            isOpen={isPatientTab && isAddPatientModalOpen}
            onClose={() => setIsAddPatientModalOpen(false)}
            onSave={async data =>
              await handlePatientModalSubmit({
                data: toPatientPayload(data),
                id: undefined,
              })
            }
            mode="add"
            initialNameFromSearch={patientDebouncedSearch}
            useInlineFieldActions={false}
          />
        </Suspense>
      ) : null}

      {isPatientTab && isEditPatientModalOpen ? (
        <Suspense fallback={null}>
          <IdentityDataModal
            title="Edit Pasien"
            data={patientModalData}
            fields={patientFields}
            isOpen={isPatientTab && isEditPatientModalOpen}
            onClose={() => setIsEditPatientModalOpen(false)}
            onSave={async data =>
              await handlePatientModalSubmit({
                data: toPatientPayload(data),
                id: editingPatient?.id,
              })
            }
            onFieldSave={async (key, value) => {
              await handlePatientFieldAutosave(editingPatient?.id, key, value);
            }}
            onDeleteRequest={
              editingPatient
                ? buildDeleteRequest({
                    entityName: 'pasien',
                    label: editingPatient.name,
                    onDelete: async () => {
                      await handlePatientDelete(editingPatient.id);
                    },
                    openConfirmDialog,
                  })
                : undefined
            }
            mode="edit"
            imageUrl={editingPatient?.image_url || undefined}
            onImageSave={handlePatientImageSave}
            onImageDelete={handlePatientImageDelete}
            useInlineFieldActions={false}
          />
        </Suspense>
      ) : null}

      {isDoctorTab && isAddDoctorModalOpen ? (
        <Suspense fallback={null}>
          <IdentityDataModal
            title="Tambah Dokter Baru"
            data={{}}
            fields={doctorFields}
            isOpen={isDoctorTab && isAddDoctorModalOpen}
            onClose={() => setIsAddDoctorModalOpen(false)}
            onSave={async data =>
              await handleDoctorModalSubmit({
                data: toDoctorPayload(data),
                id: undefined,
              })
            }
            mode="add"
            initialNameFromSearch={doctorDebouncedSearch}
            useInlineFieldActions={false}
          />
        </Suspense>
      ) : null}

      {isDoctorTab && isEditDoctorModalOpen ? (
        <Suspense fallback={null}>
          <IdentityDataModal
            title="Edit Dokter"
            data={doctorModalData}
            fields={doctorFields}
            isOpen={isDoctorTab && isEditDoctorModalOpen}
            onClose={() => setIsEditDoctorModalOpen(false)}
            onSave={async data =>
              await handleDoctorModalSubmit({
                data: toDoctorPayload(data),
                id: editingDoctor?.id,
              })
            }
            onFieldSave={async (key, value) => {
              await handleDoctorFieldAutosave(editingDoctor?.id, key, value);
            }}
            onDeleteRequest={
              editingDoctor
                ? buildDeleteRequest({
                    entityName: 'dokter',
                    label: editingDoctor.name,
                    onDelete: async () => {
                      await handleDoctorDelete(editingDoctor.id);
                    },
                    openConfirmDialog,
                  })
                : undefined
            }
            mode="edit"
            imageUrl={editingDoctor?.image_url || undefined}
            onImageSave={handleDoctorImageSave}
            onImageDelete={handleDoctorImageDelete}
            useInlineFieldActions={false}
          />
        </Suspense>
      ) : null}
    </>
  );
};
