import GenericDetailModal from "@/components/add-edit/v3";
import SearchBar from "@/components/search-bar";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import PageTitle from "@/components/page-title";
import CardName, { type CardItem } from "@/components/card-name";
import blankProfilePicture from "@/assets/blank-profile-picture.png";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import { PatientListSkeleton } from "@/components/table";
import { useState, useRef } from "react";
import { StorageService } from "@/utils/storage";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import type {
  Doctor as DoctorType,
  FieldConfig as FieldConfigDoctor,
} from "@/types";
import { useMasterDataManagement } from "@/handlers/masterData";
import { getSearchState } from "@/utils/search";

const DoctorList = () => {
  const [, setNewDoctorImage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const location = useLocation();

  const {
    handlePageChange,
    itemsPerPage,
    isAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    setIsAddModalOpen,
    editingItem,
    setEditingItem,
    handleItemsPerPageChange,
    search,
    setSearch,
    debouncedSearch,
    currentPage,
    queryClient,
    openConfirmDialog,
    totalItems,
    queryError,
    data: doctorsData,
    isLoading,
    isError,
    isFetching,
    handleKeyDown,
    handleEdit,
  } = useMasterDataManagement("doctors", "Dokter", {
    realtime: true,
    searchInputRef,
    locationKey: location.key,
  });


  const doctors = doctorsData || [];
  const currentTotalItems = totalItems || 0;
  const selectedDoctor = editingItem as DoctorType | null;

  const updateDoctor = async (updatedData: Partial<DoctorType>) => {
    if (!selectedDoctor || !selectedDoctor.id) {
      console.error(
        "Tidak dapat memperbarui: selectedDoctor atau ID-nya hilang.",
      );
      return;
    }
    const { ...dataToUpdate } = updatedData;

    const { error } = await supabase
      .from("doctors")
      .update(dataToUpdate)
      .eq("id", selectedDoctor.id);
    if (error) throw error;
  };

  const createDoctor = async (newDoctor: Partial<DoctorType>) => {
    const dataToInsert = { ...newDoctor };
    const { data, error } = await supabase
      .from("doctors")
      .insert([dataToInsert])
      .select();
    if (error) throw error;
    return data[0];
  };

  const updateDoctorMutation = useMutation<void, Error, Partial<DoctorType>>({
    mutationFn: updateDoctor,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      if (selectedDoctor) {
        setEditingItem((prev) => (prev ? { ...prev, ...variables } : null));
      }
    },
    onError: (error) => {
      console.error("Error updating doctor:", error);
      alert(`Gagal memperbarui dokter: ${error.message}`);
    },
  });

  const createDoctorMutation = useMutation<
    DoctorType,
    Error,
    Partial<DoctorType>
  >({
    mutationFn: createDoctor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setIsAddModalOpen(false);
    },
    onError: (error) => {
      console.error("Error creating doctor:", error);
      alert(`Gagal membuat dokter baru: ${error.message}`);
    },
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: async (doctorId: string) => {
      const { error } = await supabase
        .from("doctors")
        .delete()
        .eq("id", doctorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setIsEditModalOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      console.error("Error deleting doctor:", error);
      alert(`Gagal menghapus dokter: ${error.message}`);
    },
  });

  const updateDoctorImageMutation = useMutation<
    string | undefined,
    Error,
    { entityId: string; file: File }
  >({
    mutationFn: async ({
      entityId,
      file,
    }: {
      entityId: string;
      file: File;
    }) => {
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("image_url")
        .eq("id", entityId)
        .single();

      if (doctorData?.image_url) {
        const oldPath = StorageService.extractPathFromUrl(
          doctorData.image_url,
          "doctors",
        );
        if (oldPath) {
          await StorageService.deleteEntityImage("doctors", oldPath);
        }
      }

      const { publicUrl } = await StorageService.uploadEntityImage(
        "doctors",
        entityId,
        file,
      );

      const { error } = await supabase
        .from("doctors")
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", entityId);
      if (error) throw error;
      return publicUrl;
    },
    onSuccess: (newImageUrl) => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      if (newImageUrl && selectedDoctor) {
        setEditingItem((prev) =>
          prev ? { ...prev, image_url: newImageUrl } : null,
        );
      }
    },
    onError: (error) => console.error("Error updating doctor image:", error),
  });

  const openDoctorDetail = (doctor: DoctorType) => {
    handleEdit(doctor);
  };

  const openAddDoctorModal = () => {
    setIsAddModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const handleDelete = (doctor: DoctorType) => {
    openConfirmDialog({
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus dokter "${doctor.name}"? Tindakan ini tidak dapat diurungkan.`,
      variant: "danger",
      confirmText: "Hapus",
      onConfirm: () => deleteDoctorMutation.mutate(doctor.id),
    });
  };

  const doctorFields: FieldConfigDoctor[] = [
    { key: "name", label: "Nama Dokter", type: "text", editable: true },
    {
      key: "gender",
      label: "Jenis Kelamin",
      type: "text",
      editable: true,
      isRadioDropdown: true,
      options: [
        { id: "Laki-laki", name: "Laki-laki" },
        { id: "Perempuan", name: "Perempuan" },
      ],
    },
    {
      key: "specialization",
      label: "Spesialisasi",
      type: "text",
      editable: true,
    },
    {
      key: "license_number",
      label: "Nomor Lisensi",
      type: "text",
      editable: true,
    },
    { key: "birth_date", label: "Tanggal Lahir", type: "date", editable: true },
    {
      key: "experience_years",
      label: "Pengalaman (Tahun)",
      type: "text",
      editable: true,
    },
    {
      key: "qualification",
      label: "Kualifikasi",
      type: "textarea",
      editable: true,
    },
    { key: "address", label: "Alamat", type: "textarea", editable: true },
    { key: "phone", label: "Telepon", type: "tel", editable: true },
    { key: "email", label: "Email", type: "email", editable: true },
  ];


  const emptyDoctorData = {
    name: "",
    gender: "",
    specialization: "",
    license_number: "",
    birth_date: "",
    experience_years: "",
    qualification: "",
    address: "",
    phone: "",
    email: "",
    image_url: null,
  };

  const totalPages = Math.ceil(currentTotalItems / itemsPerPage);

  return (
    <Card>
      <PageTitle title="Daftar Dokter" />

      <div className="mt-6 flex items-center">
        <SearchBar
          inputRef={searchInputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari nama dokter..."
          className="grow"
          searchState={getSearchState(search, debouncedSearch, doctors)}
        />
        <Button
          variant="primary"
          withGlow
          className="flex items-center ml-4 mb-4"
          onClick={openAddDoctorModal}
        >
          <FaPlus className="mr-2" />
          Tambah Dokter Baru
        </Button>
      </div>
      {isError && !isLoading && (
        <div className="text-center text-red-500">
          Error: {queryError?.message || "Gagal memuat data"}
        </div>
      )}

      <div
        className={`${
          isFetching ? "opacity-50 transition-opacity duration-300" : ""
        }`}
      >
        {!isError && (
          <>
            {isLoading && (!doctors || doctors.length === 0) ? (
              <PatientListSkeleton rows={8} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {doctors && doctors.length > 0 ? (
                  doctors
                    .filter(
                      (doctor): doctor is DoctorType =>
                        typeof doctor === "object" &&
                        doctor !== null &&
                        "name" in doctor &&
                        "id" in doctor,
                    )
                    .map((doctor, index) => (
                      <CardName
                        key={doctor.id}
                        item={doctor as unknown as CardItem}
                        index={index}
                        debouncedSearch={debouncedSearch}
                        onClick={(item) => openDoctorDetail(item as unknown as DoctorType)}
                        imageConfig={{
                          imageKey: "image_url",
                          blankImage: blankProfilePicture,
                          altText: `Foto ${doctor.name}`,
                          isRounded: true,
                        }}
                        fields={[
                          { key: "gender", label: "Jenis Kelamin" },
                          { key: "specialization", label: "Spesialisasi" },
                          { key: "license_number", label: "Nomor Lisensi" },
                          { key: "phone", label: "Telepon" },
                          { key: "email", label: "Email" },
                        ]}
                      />
                    ))
                ) : (
                  <div className="col-span-full text-center text-gray-500 py-10">
                    {debouncedSearch
                      ? `Tidak ada dokter dengan kata kunci "${debouncedSearch}"`
                      : "Belum ada data dokter."}
                  </div>
                )}
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={currentTotalItems}
              itemsPerPage={itemsPerPage}
              itemsCount={doctors?.length || 0}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
      </div>

      <GenericDetailModal
        title={selectedDoctor ? `${selectedDoctor.name}` : ""}
        data={(selectedDoctor as unknown) as Record<string, string | number | boolean | null> || {}}
        fields={doctorFields}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={async (
          updatedData: Record<string, string | number | boolean | null>,
        ) => {
          if (selectedDoctor) {
            await updateDoctorMutation.mutateAsync(updatedData);
          }
          return Promise.resolve();
        }}
        onFieldSave={async (key: string, value: unknown) => {
          if (selectedDoctor && selectedDoctor.id) {
            const dataToUpdate: Partial<DoctorType> = {
              id: selectedDoctor.id,
              [key]: value,
            };
            await updateDoctorMutation.mutateAsync(dataToUpdate);
          }
        }}
        onDeleteRequest={() => {
          if (selectedDoctor) handleDelete(selectedDoctor);
        }}
        deleteButtonLabel="Hapus Dokter"
        imageUrl={selectedDoctor?.image_url || undefined}
        defaultImageUrl={blankProfilePicture}
        onImageSave={async (data: { entityId?: string; file: File }) => {
          const idToUse = data.entityId || selectedDoctor?.id;
          if (idToUse) {
            await updateDoctorImageMutation.mutateAsync({
              entityId: idToUse,
              file: data.file,
            });
          }
        }}
        imageUploadText="Unggah Foto Dokter"
        imageNotAvailableText="Foto dokter belum diunggah"
        mode="edit"
        imageAspectRatio="square"
      />

      <GenericDetailModal
        title="Tambah Dokter Baru"
        data={emptyDoctorData}
        fields={doctorFields}
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSave={async (newDoctorData) => {
          await createDoctorMutation.mutateAsync(newDoctorData);
          return Promise.resolve();
        }}
        initialNameFromSearch={debouncedSearch}
        onImageSave={async (data: { entityId?: string; file: File }) => {
          if (data.entityId) {
            await updateDoctorImageMutation.mutateAsync({
              entityId: data.entityId,
              file: data.file,
            });
          } else {
            setNewDoctorImage(URL.createObjectURL(data.file));
          }
        }}
        imageUploadText="Unggah Foto Dokter (Opsional)"
        imageNotAvailableText="Foto dokter belum diunggah"
        mode="add"
        imageAspectRatio="square"
      />
    </Card>
  );
};

export default DoctorList;
