import { Input, Button, useConfirmDialog } from "@/components/modules";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import type { AddCategoryModalProps } from "@/types";
import { Transition, TransitionChild } from "@headlessui/react";
import React, { useState, useEffect, Fragment, useRef } from "react";

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData = null,
    onDelete,
    isLoading = false,
    isDeleting = false,
    entityName = "Kategori",
}) => {
    useConfirmDialog();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isEditMode = Boolean(initialData);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description || "");
            } else {
                setName("");
                setDescription("");
            }
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [description]);

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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
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
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-semibold">
                                {isEditMode
                                    ? `Edit ${entityName}`
                                    : `Tambah ${entityName} Baru`}
                            </h2>
                            <Button
                                variant="text"
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 p-1"
                            >
                                <FaTimes size={20} />
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <Input
                                label={`Nama ${entityName}`}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={`Masukkan nama ${entityName.toLowerCase()}`}
                                required
                                readOnly={isLoading || isDeleting}
                            />

                            <div className="space-y-1">
                                <label
                                    htmlFor="description"
                                    className="block text-sm font-medium"
                                >
                                    Deskripsi (Opsional)
                                </label>
                                <textarea
                                    ref={textareaRef}
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Masukkan deskripsi singkat"
                                    readOnly={isLoading || isDeleting}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px] resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between p-4 border-t">
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
                                    <Button type="button" variant="outline" onClick={onClose}>
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
                                    disabled={isLoading || !name.trim()}
                                >
                                    Simpan
                                </Button>
                            </div>
                        </div>
                    </div>
                </TransitionChild>
            </div>
        </Transition>,
        document.body
    );
};
