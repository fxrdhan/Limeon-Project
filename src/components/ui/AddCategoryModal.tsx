import React, { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Input } from './Input';
import { Transition, TransitionChild } from '@headlessui/react';
import { FaTimes } from 'react-icons/fa';

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: { name: string; description: string }) => Promise<void>;
    isLoading?: boolean;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
    isOpen,
    onClose,
    onSave,
    isLoading = false
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName('');
            setDescription('');
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!name.trim()) {
            alert("Nama kategori tidak boleh kosong.");
            return;
        }
        await onSave({ name, description });
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <Transition show={isOpen} as={Fragment}>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
                onClick={handleBackdropClick}
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
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
                </TransitionChild>

                <TransitionChild
                    as={Fragment}
                    enter="transition-all duration-300 ease-out"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition-all duration-200 ease-in"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-semibold">Tambah Kategori Baru</h2>
                            <Button variant="text" onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
                                <FaTimes size={20} />
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <Input label="Nama Kategori" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama kategori" required />
                            <Input label="Deskripsi (Opsional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Masukkan deskripsi singkat" />
                        </div>
                        <div className="flex justify-between p-4 border-t">
                            <div>
                                <Button type="button" variant="outline" onClick={onClose}>
                                    Batal
                                </Button>
                            </div>
                            <div>
                                <Button type="button" variant="primary" onClick={handleSave} isLoading={isLoading} disabled={isLoading || !name.trim()}>
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