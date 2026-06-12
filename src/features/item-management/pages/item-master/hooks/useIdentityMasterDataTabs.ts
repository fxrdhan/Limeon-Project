import { useCallback, useMemo } from 'react';
import { useCustomerLevels } from '@/features/item-management/application/hooks/data/useCustomerLevels';
import { useMasterDataManagement } from '@/features/item-management/application/hooks/data/useMasterDataManagement';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  Patient as PatientType,
} from '@/types';
import {
  buildCustomerColumnDefs,
  buildCustomerFields,
  buildDoctorColumnDefs,
  buildPatientColumnDefs,
  DOCTOR_FIELDS,
  PATIENT_FIELDS,
  toCustomerLevelNameMap,
  toCustomerLevelOptions,
  toCustomerPayload as buildCustomerPayload,
  toDoctorPayload,
  toPatientPayload,
} from '../identityTabConfig';

interface UseIdentityMasterDataTabsParams {
  isCustomerTab: boolean;
  isDoctorTab: boolean;
  isPatientTab: boolean;
}

export const useIdentityMasterDataTabs = ({
  isCustomerTab,
  isDoctorTab,
  isPatientTab,
}: UseIdentityMasterDataTabsParams) => {
  const {
    isAddModalOpen: isAddCustomerModalOpen,
    setIsAddModalOpen: setIsAddCustomerModalOpen,
    isEditModalOpen: isEditCustomerModalOpen,
    setIsEditModalOpen: setIsEditCustomerModalOpen,
    editingItem: editingCustomer,
    data: customersData,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    queryError: customersQueryError,
    itemsPerPage: customerItemsPerPage,
    handleEdit: handleCustomerEdit,
    handleModalSubmit: handleCustomerModalSubmit,
    handleFieldAutosave: handleCustomerFieldAutosave,
    handleDelete: handleCustomerDelete,
    debouncedSearch: customerDebouncedSearch,
    handleKeyDown: handleCustomerKeyDown,
    setSearch: setCustomerDataSearch,
  } = useMasterDataManagement('customers', 'Pelanggan', {
    enabled: isCustomerTab,
  });

  const {
    isAddModalOpen: isAddPatientModalOpen,
    setIsAddModalOpen: setIsAddPatientModalOpen,
    isEditModalOpen: isEditPatientModalOpen,
    setIsEditModalOpen: setIsEditPatientModalOpen,
    editingItem: editingPatient,
    data: patientsData,
    isLoading: isPatientsLoading,
    isError: isPatientsError,
    queryError: patientsQueryError,
    itemsPerPage: patientItemsPerPage,
    handleEdit: handlePatientEdit,
    handleModalSubmit: handlePatientModalSubmit,
    handleFieldAutosave: handlePatientFieldAutosave,
    handleImageSave: handlePatientImageSave,
    handleImageDelete: handlePatientImageDelete,
    handleDelete: handlePatientDelete,
    debouncedSearch: patientDebouncedSearch,
    handleKeyDown: handlePatientKeyDown,
    setSearch: setPatientDataSearch,
  } = useMasterDataManagement('patients', 'Pasien', {
    enabled: isPatientTab,
  });

  const {
    isAddModalOpen: isAddDoctorModalOpen,
    setIsAddModalOpen: setIsAddDoctorModalOpen,
    isEditModalOpen: isEditDoctorModalOpen,
    setIsEditModalOpen: setIsEditDoctorModalOpen,
    editingItem: editingDoctor,
    data: doctorsData,
    isLoading: isDoctorsLoading,
    isError: isDoctorsError,
    queryError: doctorsQueryError,
    itemsPerPage: doctorItemsPerPage,
    handleEdit: handleDoctorEdit,
    handleModalSubmit: handleDoctorModalSubmit,
    handleFieldAutosave: handleDoctorFieldAutosave,
    handleImageSave: handleDoctorImageSave,
    handleImageDelete: handleDoctorImageDelete,
    handleDelete: handleDoctorDelete,
    debouncedSearch: doctorDebouncedSearch,
    handleKeyDown: handleDoctorKeyDown,
    setSearch: setDoctorDataSearch,
  } = useMasterDataManagement('doctors', 'Dokter', {
    enabled: isDoctorTab,
  });

  const { levels: customerLevels } = useCustomerLevels({
    enabled: isCustomerTab,
  });
  const customersDataTyped = customersData as CustomerType[];
  const patientsDataTyped = patientsData as PatientType[];
  const doctorsDataTyped = doctorsData as DoctorType[];

  const customerLevelOptions = useMemo(
    () => toCustomerLevelOptions(customerLevels),
    [customerLevels]
  );

  const customerLevelById = useMemo(
    () => toCustomerLevelNameMap(customerLevels),
    [customerLevels]
  );

  const defaultCustomerLevelId = customerLevels[0]?.id ?? null;

  const toCustomerPayload = useCallback(
    (data: Record<string, string | number | boolean | null>) =>
      buildCustomerPayload(data, defaultCustomerLevelId),
    [defaultCustomerLevelId]
  );

  const customerFields = useMemo(
    () => buildCustomerFields(customerLevelOptions),
    [customerLevelOptions]
  );

  const customerColumnDefs = useMemo(
    () => buildCustomerColumnDefs(customerLevelById),
    [customerLevelById]
  );
  const patientColumnDefs = useMemo(() => buildPatientColumnDefs(), []);
  const doctorColumnDefs = useMemo(() => buildDoctorColumnDefs(), []);

  return {
    customerColumnDefs,
    customerDebouncedSearch,
    customerFields,
    customerItemsPerPage,
    customersDataTyped,
    customersQueryError,
    defaultCustomerLevelId,
    doctorColumnDefs,
    doctorDebouncedSearch,
    doctorFields: DOCTOR_FIELDS,
    doctorItemsPerPage,
    doctorsDataTyped,
    doctorsQueryError,
    editingCustomer,
    editingDoctor,
    editingPatient,
    handleCustomerDelete,
    handleCustomerEdit,
    handleCustomerFieldAutosave,
    handleCustomerKeyDown,
    handleCustomerModalSubmit,
    handleDoctorDelete,
    handleDoctorEdit,
    handleDoctorFieldAutosave,
    handleDoctorImageDelete,
    handleDoctorImageSave,
    handleDoctorKeyDown,
    handleDoctorModalSubmit,
    handlePatientDelete,
    handlePatientEdit,
    handlePatientFieldAutosave,
    handlePatientImageDelete,
    handlePatientImageSave,
    handlePatientKeyDown,
    handlePatientModalSubmit,
    isAddCustomerModalOpen,
    isAddDoctorModalOpen,
    isAddPatientModalOpen,
    isCustomersError,
    isCustomersLoading,
    isDoctorsError,
    isDoctorsLoading,
    isEditCustomerModalOpen,
    isEditDoctorModalOpen,
    isEditPatientModalOpen,
    isPatientsError,
    isPatientsLoading,
    patientColumnDefs,
    patientDebouncedSearch,
    patientFields: PATIENT_FIELDS,
    patientItemsPerPage,
    patientsDataTyped,
    patientsQueryError,
    setCustomerDataSearch,
    setDoctorDataSearch,
    setIsAddCustomerModalOpen,
    setIsAddDoctorModalOpen,
    setIsAddPatientModalOpen,
    setIsEditCustomerModalOpen,
    setIsEditDoctorModalOpen,
    setIsEditPatientModalOpen,
    setPatientDataSearch,
    toCustomerPayload,
    toDoctorPayload,
    toPatientPayload,
  };
};
