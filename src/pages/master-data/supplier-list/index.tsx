import GenericDetailModal from "@/components/add-edit/v3";
import SearchBar from "@/components/search-bar";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import PageTitle from "@/components/page-title";
import CardName from "@/components/card-name";
import { type CardItem } from "@/types";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import { SupplierListSkeleton } from "@/components/table";
import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import type {
  Supplier as SupplierType,
  FieldConfig as FieldConfigSupplier,
} from "@/types";
import { useMasterDataManagement } from "@/handlers/masterData";
import { StorageService } from "@/utils/storage";
import { getSearchState } from "@/utils/search";

const SupplierList = () => {
  const [, setNewSupplierImage] = useState<string | null>(null);
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
    data: suppliersData,
    isLoading,
    isError,
    isFetching,
    handleKeyDown,
    handleEdit,
  } = useMasterDataManagement("suppliers", "Supplier", {
    realtime: true,
    searchInputRef,
    locationKey: location.key,
  });


  const suppliers = suppliersData || [];
  const currentTotalItems = totalItems || 0;
  const selectedSupplier = editingItem as SupplierType | null;

  const updateSupplier = async (updatedData: Partial<SupplierType>) => {
    if (!selectedSupplier || !selectedSupplier.id) {
      console.error(
        "Tidak dapat memperbarui: selectedSupplier atau ID-nya hilang.",
      );
      return;
    }
    const { ...dataToUpdate } = updatedData;

    const { error } = await supabase
      .from("suppliers")
      .update(dataToUpdate)
      .eq("id", selectedSupplier.id);
    if (error) throw error;
  };

  const createSupplier = async (newSupplier: Partial<SupplierType>) => {
    const dataToInsert = { ...newSupplier };
    const { data, error } = await supabase
      .from("suppliers")
      .insert([dataToInsert])
      .select();
    if (error) throw error;
    return data[0];
  };

  const updateSupplierMutation = useMutation<
    void,
    Error,
    Partial<SupplierType>
  >({
    mutationFn: updateSupplier,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (selectedSupplier) {
        setEditingItem((prev) => (prev ? { ...prev, ...variables } : null));
      }
    },
    onError: (error) => {
      console.error("Error updating supplier:", error);
      alert(`Gagal memperbarui supplier: ${error.message}`);
    },
  });

  const createSupplierMutation = useMutation<
    SupplierType,
    Error,
    Partial<SupplierType>
  >({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsAddModalOpen(false);
      setNewSupplierImage(null);
    },
    onError: (error) => {
      console.error("Error creating supplier:", error);
      alert(`Gagal membuat supplier baru: ${error.message}`);
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsEditModalOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      console.error("Error deleting supplier:", error);
      alert(`Gagal menghapus supplier: ${error.message}`);
    },
  });

  const updateSupplierImageMutation = useMutation<
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
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("image_url")
        .eq("id", entityId)
        .single();

      if (supplierData?.image_url) {
        const oldPath = StorageService.extractPathFromUrl(
          supplierData.image_url,
          "suppliers",
        );
        if (oldPath) {
          await StorageService.deleteEntityImage("suppliers", oldPath);
        }
      }

      const { publicUrl } = await StorageService.uploadEntityImage(
        "suppliers",
        entityId,
        file,
      );

      const { error } = await supabase
        .from("suppliers")
        .update({
          image_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entityId);
      if (error) throw error;
      return publicUrl;
    },
    onSuccess: (newImageUrl) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (newImageUrl && selectedSupplier) {
        setEditingItem((prev) => {
          if (!prev) return null;
          return { ...prev, image_url: newImageUrl };
        });
      }
    },
    onError: (error) => {
      console.error("Error updating supplier image:", error);
      alert(`Gagal memperbarui foto supplier: ${error.message}`);
    },
  });

  const openSupplierDetail = (supplier: SupplierType) => {
    handleEdit(supplier);
  };

  const openAddSupplierModal = () => {
    setIsAddModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewSupplierImage(null);
  };

  const handleDelete = (supplier: SupplierType) => {
    openConfirmDialog({
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus supplier "${supplier.name}"? Tindakan ini tidak dapat diurungkan.`,
      variant: "danger",
      confirmText: "Hapus",
      onConfirm: () => deleteSupplierMutation.mutate(supplier.id),
    });
  };

  const supplierFields: FieldConfigSupplier[] = [
    { key: "name", label: "Nama Supplier", type: "text", editable: true },
    { key: "address", label: "Alamat", type: "textarea", editable: true },
    { key: "phone", label: "Telepon", type: "tel", editable: true },
    { key: "email", label: "Email", type: "email", editable: true },
    {
      key: "contact_person",
      label: "Kontak Person",
      type: "text",
      editable: true,
    },
  ];


  const emptySupplierData = {
    name: "",
    address: "",
    phone: "",
    email: "",
    contact_person: "",
  };

  const totalPages = Math.ceil(currentTotalItems / itemsPerPage);

  return (
    <Card>
      <PageTitle title="Daftar Supplier" />

      <div className="mt-6 flex items-center">
        <SearchBar
          inputRef={searchInputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari supplier..."
          className="grow"
          searchState={getSearchState(search, debouncedSearch, suppliers)}
        />
        <Button
          variant="primary"
          withGlow
          className="flex items-center ml-4 mb-4"
          onClick={openAddSupplierModal}
        >
          <FaPlus className="mr-2" />
          Tambah Supplier Baru
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
            {isLoading && (!suppliers || suppliers.length === 0) ? (
              <SupplierListSkeleton rows={8} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suppliers && suppliers.length > 0 ? (
                  suppliers
                    .filter(
                      (supplier): supplier is SupplierType =>
                        typeof supplier === "object" &&
                        supplier !== null &&
                        "address" in supplier &&
                        "name" in supplier &&
                        "id" in supplier,
                    )
                    .map((supplier, index) => (
                      <CardName
                        key={supplier.id}
                        item={supplier as unknown as CardItem}
                        index={index}
                        debouncedSearch={debouncedSearch}
                        onClick={(item) => openSupplierDetail(item as unknown as SupplierType)}
                        imageConfig={{
                          imageKey: "image_url",
                          altText: `Logo ${supplier.name}`,
                          isRounded: false,
                        }}
                        fields={[
                          { key: "address", label: "Alamat", type: "long" },
                          { key: "phone", label: "Telepon" },
                          { key: "email", label: "Email" },
                          { key: "contact_person", label: "Kontak Person" },
                        ]}
                      />
                    ))
                ) : (
                  <div className="col-span-full text-center text-gray-500 py-10">
                    {debouncedSearch
                      ? `Tidak ada supplier dengan kata kunci "${debouncedSearch}"`
                      : "Belum ada data supplier."}
                  </div>
                )}
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={currentTotalItems}
              itemsPerPage={itemsPerPage}
              itemsCount={suppliers?.length || 0}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
      </div>

      <GenericDetailModal
        title={selectedSupplier ? `${selectedSupplier.name}` : ""}
        data={(selectedSupplier as unknown) as Record<string, string | number | boolean | null> || {}}
        fields={supplierFields}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={async (
          updatedData: Record<string, string | number | boolean | null>,
        ) => {
          if (selectedSupplier) {
            await updateSupplierMutation.mutateAsync(updatedData);
          }
          return Promise.resolve();
        }}
        onFieldSave={async (key: string, value: unknown) => {
          if (selectedSupplier && selectedSupplier.id) {
            const dataToUpdate: Partial<SupplierType> = {
              id: selectedSupplier.id,
              [key]: value,
            };
            await updateSupplierMutation.mutateAsync(dataToUpdate);
          }
        }}
        onImageSave={async (data: { entityId?: string; file: File }) => {
          const idToUse = data.entityId || selectedSupplier?.id;
          if (idToUse) {
            await updateSupplierImageMutation.mutateAsync({
              entityId: idToUse,
              file: data.file,
            });
          }
        }}
        onDeleteRequest={() => {
          if (selectedSupplier) handleDelete(selectedSupplier);
        }}
        deleteButtonLabel="Hapus Supplier"
        imageUrl={selectedSupplier?.image_url || undefined}
        imageUploadText="Unggah Logo Supplier"
        imageNotAvailableText="Logo supplier belum diunggah"
        mode="edit"
      />

      <GenericDetailModal
        title="Tambah Supplier Baru"
        data={emptySupplierData}
        fields={supplierFields}
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSave={async (newSupplierData) => {
          await createSupplierMutation.mutateAsync(newSupplierData);
          return Promise.resolve();
        }}
        initialNameFromSearch={debouncedSearch}
        onImageSave={(data: { entityId?: string; file: File }) => {
          console.log(
            "Image uploaded for new supplier (ID to be assigned upon save):",
            data.file,
            data.entityId,
          );
          return Promise.resolve();
        }}
        imageUploadText="Unggah Logo Supplier (Opsional)"
        imageNotAvailableText="Logo supplier belum diunggah"
        mode="add"
      />
    </Card>
  );
};

export default SupplierList;
