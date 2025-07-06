import Input from "@/components/input";
import Button from "@/components/button";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import { useConfirmDialog } from "@/components/dialog-box";
import { createPortal } from "react-dom";
import { FaTimes, FaHistory } from "react-icons/fa";
import type { AddEditModalProps } from "@/types";
import { Transition, TransitionChild } from "@headlessui/react";
import { formatDateTime } from "@/lib/formatters";
import React, { useState, useEffect, Fragment, useRef } from "react";

const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  onDelete,
  isLoading = false,
  isDeleting = false,
  entityName = "Kategori",
  initialNameFromSearch,
}) => {
  useConfirmDialog();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = Boolean(initialData);
  const formattedUpdateAt = formatDateTime(initialData?.updated_at);

  const isDirty = () => {
    if (!isEditMode) return true;
    return (
      name !== (initialData?.name || "") ||
      description !== (initialData?.description || "")
    );
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || "");
      } else if (initialNameFromSearch) {
        setName(initialNameFromSearch);
        setDescription("");
      } else {
        setName("");
        setDescription("");
      }
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialData, initialNameFromSearch]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert(`Nama ${entityName.toLowerCase()} tidak boleh kosong.`);
      return;
    }
    await onSubmit({ id: initialData?.id, name, description });
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData.id);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <Transition show={isOpen} as={Fragment}>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
            onClick={handleBackdropClick}
          />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="transition-all duration-200 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition-all duration-200 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b-2 border-gray-200 bg-gray-100 rounded-t-xl">
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold">
                  {isEditMode
                    ? `Edit ${entityName}`
                    : `Tambah ${entityName} Baru`}
                </h2>
                {isEditMode && formattedUpdateAt !== "-" && (
                  <span className="text-sm text-gray-500 italic flex items-center mt-1">
                    <FaHistory className="mr-1" size={12} />
                    {formattedUpdateAt}
                  </span>
                )}
              </div>
              <Button variant="text" onClick={onClose}>
                <FaTimes size={20} />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <Input
                ref={nameInputRef}
                label={`Nama ${entityName}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Masukkan nama ${entityName.toLowerCase()}`}
                required
                readOnly={isLoading || isDeleting}
              />

              <DescriptiveTextarea
                label="Deskripsi"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Masukkan deskripsi singkat"
                readOnly={isLoading || isDeleting}
                textareaClassName="text-sm min-h-[80px] resize-none"
                rows={3}
                showInitially={!!(initialData?.description || description)}
              />
            </div>
            <div className="flex justify-between p-4 border-t-2 border-gray-200 rounded-b-lg">
              <div>
                {isEditMode && onDelete ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleDelete}
                    isLoading={isDeleting}
                    disabled={isLoading || isDeleting}
                  >
                    Hapus
                  </Button>
                ) : (
                  <Button type="button" variant="text" onClick={onClose}>
                    Batal
                  </Button>
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isLoading}
                  disabled={
                    isLoading || !name.trim() || (isEditMode && !isDirty())
                  }
                >
                  {isEditMode ? "Update" : "Simpan"}
                </Button>
              </div>
            </div>
          </div>
        </TransitionChild>
      </div>
    </Transition>,
    document.body,
  );
};

export default AddEditModal;
