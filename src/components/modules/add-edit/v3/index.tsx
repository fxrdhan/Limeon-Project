import ImageUploader from "@/components/modules/image-uploader";
import Input from "@/components/modules/input";
import Dropdown from "@/components/modules/dropdown";
import Datepicker from "@/components/modules/datepicker";
import Button from "@/components/modules/button";
import { createPortal } from "react-dom";
import { Transition, TransitionChild, Dialog } from "@headlessui/react";
import React, { Fragment, useRef, useState, useEffect } from "react";
import type { GenericDetailModalProps, CustomDateValueType } from "@/types";
import { FaPencilAlt, FaSpinner, FaSave, FaBan } from "react-icons/fa";
import { useDetailForm } from "@/hooks/detailForm";

const GenericDetailModal: React.FC<GenericDetailModalProps> = ({
    title,
    data,
    fields,
    isOpen,
    onClose,
    onSave,
    onFieldSave,
    onImageSave: onImageSaveProp,
    onImageDelete: onImageDeleteProp,
    imageUrl,
    defaultImageUrl,
    imagePlaceholder,
    imageUploadText = "Unggah gambar",
    imageNotAvailableText = "Gambar belum tersedia",
    imageFormatHint = "Format: JPG, PNG",
    onDeleteRequest,
    deleteButtonLabel = "Hapus",
    mode = "edit",
    initialNameFromSearch,
    imageAspectRatio = 'default',
}) => {
    const dialogPanelRef = useRef<HTMLDivElement>(null);
    const [, setIsClosing] = useState(false);

    const {
        editMode,
        editValues,
        currentImageUrl,
        isUploadingImage,
        loadingField,
        isSubmitting,
        localData,
        toggleEdit,
        handleChange,
        handleSaveField,
        handleSaveAll,
        handleCancelEdit,
        handleImageUpload,
        handleImageDeleteInternal,
        resetInternalState,
        setInputRef,
    } = useDetailForm({
        initialData: data,
        fields,
        onSave: onSave || (() => Promise.resolve()),
        onFieldSave,
        onImageSave: onImageSaveProp,
        onImageDelete: onImageDeleteProp ? (entityId?: string) => {
            if (entityId) {
                return onImageDeleteProp(entityId);
            }
            return Promise.resolve();
        } : undefined,
        initialImageUrl: imageUrl,
        mode,
        isOpen,
        initialNameFromSearch,
    });

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    // Auto-focus on name field when modal opens
    useEffect(() => {
        if (isOpen) {
            const nameField = fields.find(field => 
                field.key === 'name' || 
                field.key === 'nama' || 
                field.label.toLowerCase().includes('nama')
            );
            
            if (nameField && (mode === 'add' || editMode[nameField.key])) {
                setTimeout(() => {
                    const inputElement = document.getElementById(nameField.key) as HTMLInputElement | HTMLTextAreaElement;
                    if (inputElement) {
                        inputElement.focus();
                    }
                }, 100);
            }
        }
    }, [isOpen, mode, editMode, fields]);

    const handleCloseModal = () => {
        setIsClosing(true);
        
        requestAnimationFrame(() => {
            const searchInput = document.querySelector('input[placeholder*="Cari"]') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
            }
        });
        
        onClose();
    };

    const aspectRatioClass = imageAspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

    return createPortal(
        <Transition
            show={isOpen}
            as={Fragment}
            afterLeave={() => {
                setIsClosing(false);
                if (resetInternalState) resetInternalState();
                
                setTimeout(() => {
                    const searchInput = document.querySelector('input[placeholder*="Cari"]') as HTMLInputElement;
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 50);
            }}
        >
            <Dialog
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
                onClose={handleCloseModal}
            >
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
                    <Dialog.Panel
                        ref={dialogPanelRef}
                        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden relative mx-4 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-semibold">{title}</h2>
                        </div>

                        <div className="p-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <div className="flex justify-center mb-6">
                                <div className="relative group w-48">
                                    <ImageUploader
                                        id="supplier-image-upload"
                                        className="w-full"
                                        shape="rounded"
                                        onImageUpload={handleImageUpload}
                                        onImageDelete={handleImageDeleteInternal}
                                        disabled={
                                            isUploadingImage || (!onImageSaveProp && mode !== "add")
                                        }
                                        loadingIcon={
                                            <FaSpinner className="text-white text-xl animate-spin" />
                                        }
                                        defaultIcon={<FaPencilAlt className="text-white text-lg" />}
                                    >
                                        {currentImageUrl ? (
                                            <img
                                                src={currentImageUrl}
                                                alt={String(localData?.name ?? "Detail")}
                                                className={`w-full h-auto ${aspectRatioClass} object-cover rounded-md border border-gray-200`}
                                            />
                                        ) : mode === "add" ? (
                                            <div className={`w-full ${aspectRatioClass} flex items-center justify-center border border-dashed border-gray-300 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors`}>
                                                <div className="text-center p-4">
                                                    <p className="text-sm font-medium text-gray-600">
                                                        {imageUploadText}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">{imageFormatHint}</p>
                                                </div>
                                            </div>
                                        ) : defaultImageUrl ? (
                                            <img
                                                src={defaultImageUrl}
                                                alt={String(localData?.name ?? "Detail")}
                                                className={`w-full h-auto ${aspectRatioClass} object-cover rounded-md border border-gray-200`}
                                            />
                                        ) : imagePlaceholder ? (
                                            <img
                                                src={imagePlaceholder}
                                                alt={String(localData?.name ?? "Detail")}
                                                className={`w-full h-auto ${aspectRatioClass} object-cover rounded-md border border-gray-200`}
                                            />
                                        ) : (
                                            <div className={`w-full ${aspectRatioClass} flex items-center justify-center border border-gray-200 rounded-md bg-gray-50`}>
                                                <div className="text-center p-4">
                                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <svg
                                                            className="w-8 h-8 text-gray-400"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={1.5}
                                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <p className="text-gray-500 font-medium">
                                                        {imageNotAvailableText}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </ImageUploader>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {fields.map((field) => (
                                    <div key={field.key} className="bg-white rounded-md">
                                        <div className="flex justify-between items-center mb-1">
                                            <label
                                                htmlFor={field.key}
                                                className="text-sm font-medium text-gray-600"
                                            >
                                                {field.label}
                                            </label>
                                            {field.editable !== false && mode === "edit" && (
                                                <div className="flex">
                                                    {editMode[field.key] ? (
                                                        <>
                                                            <Button
                                                                variant="text"
                                                                size="sm"
                                                                onClick={() => handleCancelEdit(field.key)}
                                                                className="text-gray-500 hover:text-red-500 p-1"
                                                                title="Batal"
                                                            >
                                                                <FaBan className="text-red-500 text-sm" />
                                                            </Button>
                                                            <Button
                                                                variant="text"
                                                                size="sm"
                                                                onClick={() => handleSaveField(field.key)}
                                                                className="text-gray-500 hover:text-gray-700 p-1"
                                                                disabled={loadingField[field.key]}
                                                                title="Simpan"
                                                            >
                                                                {loadingField[field.key] ? (
                                                                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
                                                                ) : (
                                                                    <FaSave className="text-green-500 text-sm" />
                                                                )}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="text"
                                                            size="sm"
                                                            onClick={() => toggleEdit(field.key)}
                                                            className="text-gray-500 hover:text-gray-700 p-1"
                                                            title="Edit"
                                                        >
                                                            <FaPencilAlt className="text-primary text-sm" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {editMode[field.key] || mode === "add" ? (
                                            field.isRadioDropdown && field.options ? (
                                                <Dropdown
                                                    name={field.key}
                                                    options={field.options}
                                                    value={String(editValues[field.key] ?? "")}
                                                    onChange={(selectedValue) => handleChange(field.key, selectedValue)}
                                                    placeholder={`Pilih ${field.label.toLowerCase()}`}
                                                    withRadio={true}
                                                    searchList={false}
                                                />
                                            ) : field.type === "date" ? (
                                                <Datepicker
                                                    value={editValues[field.key] ? new Date(String(editValues[field.key])) : null}
                                                    onChange={(date: CustomDateValueType) => {
                                                        const formattedDate = date ? date.toISOString().split('T')[0] : null;
                                                        handleChange(field.key, formattedDate as string | number | boolean);
                                                    }}
                                                    placeholder={`Pilih ${field.label.toLowerCase()}`}
                                                    inputClassName="w-full p-2.5 border rounded-lg text-sm"
                                                    portalWidth="300px"
                                                />
                                            ) : field.type === "textarea" ? (
                                                <textarea
                                                    ref={(el) =>
                                                        setInputRef(field.key, el as HTMLTextAreaElement)
                                                    }
                                                    id={field.key}
                                                    className="text-sm w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring focus:ring-teal-100 transition duration-200 ease-in-out"
                                                    value={String(editValues[field.key] ?? "")}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLTextAreaElement>
                                                    ) => handleChange(field.key, e.target.value)}
                                                    rows={3}
                                                />
                                            ) : (
                                                <Input
                                                    ref={(el) =>
                                                        setInputRef(field.key, el as HTMLInputElement)
                                                    }
                                                    id={field.key}
                                                    type={field.type || "text"}
                                                    value={String(editValues[field.key] ?? "")}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        handleChange(field.key, e.target.value)
                                                    }
                                                    fullWidth
                                                />
                                            )
                                        ) : (
                                            <div className="p-2 bg-gray-50 rounded-md min-h-[40px] text-sm">
                                                {field.type === "date" && localData[field.key]
                                                    ? new Date(String(localData[field.key])).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
                                                    : String(localData[field.key] ?? "") || (
                                                    <span className="text-gray-400 italic">
                                                        Tidak ada data
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t flex justify-between items-center bg-white">
                            {mode === "edit" ? (
                                <>
                                    {onDeleteRequest && (
                                        <Button
                                            variant="danger"
                                            onClick={() => onDeleteRequest(data)}
                                        >
                                            {deleteButtonLabel}
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseModal}
                                    >
                                        Tutup
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseModal}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={handleSaveAll}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center">
                                                <FaSpinner className="animate-spin mr-2" />
                                                Menyimpan...
                                            </span>
                                        ) : (
                                            "Simpan"
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Dialog.Panel>
                </TransitionChild>
            </Dialog>
        </Transition>,
        document.body
    );
};

export default GenericDetailModal;
