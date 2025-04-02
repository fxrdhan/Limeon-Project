// src/components/ui/Pagination.tsx
import { classNames } from "../../lib/classNames";
import { Button } from "./Button";

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    itemsCount: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    className?: string;
}

export const Pagination = ({
    currentPage,
    totalPages,
    // totalItems,
    itemsPerPage,
    // itemsCount,
    onPageChange,
    onItemsPerPageChange,
    className,
}: PaginationProps) => {
    // const pageNumbers = [];
    // Sudah tidak memerlukan pageNumbers untuk tampilan semua halaman

    // Fungsi untuk menangani perubahan jumlah item per halaman
    const handleItemsPerPageClick = (value: number) => {
        const event = {
            target: { value: value.toString() }
        } as React.ChangeEvent<HTMLSelectElement>;
        onItemsPerPageChange(event);
    };

    return (
        <div className={classNames("flex justify-between items-center mt-4 gap-4", className)}>
            {/* Items per page selection - left side */}
            <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden">
                <button 
                    className={classNames(
                        "px-3 py-1.5 rounded-full focus:outline-none transition-all duration-300 ease-in-out", 
                        itemsPerPage === 10 ? "bg-blue-500 text-white font-medium shadow-sm transform scale-105" : "hover:bg-blue-100 hover:text-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(10)}
                >
                    {itemsPerPage === 10 ? "10 items" : "10"}
                </button>
                <button 
                    className={classNames(
                        "px-3 py-1.5 rounded-full focus:outline-none transition-all duration-300 ease-in-out", 
                        itemsPerPage === 20 ? "bg-blue-500 text-white font-medium shadow-sm transform scale-105" : "hover:bg-blue-100 hover:text-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(20)}
                >
                    {itemsPerPage === 20 ? "20 items" : "20"}
                </button>
                <button 
                    className={classNames(
                        "px-3 py-1.5 rounded-full focus:outline-none transition-all duration-300 ease-in-out", 
                        itemsPerPage === 40 ? "bg-blue-500 text-white font-medium shadow-sm transform scale-105" : "hover:bg-blue-100 hover:text-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(40)}
                >
                    {itemsPerPage === 40 ? "40 items" : "40"}
                </button>
            </div>

            {/* Page navigation - right side */}
            <div className="flex items-center rounded-full bg-primary p-1 shadow-md text-white overflow-hidden">
                <Button
                    variant="text"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={classNames("px-3 py-1.5 rounded-full text-white focus:ring-0 focus:outline-none transition-all duration-300", currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600")}
                >
                    &lt;
                </Button>

                <div className="px-3 py-1.5 font-medium">
                    {currentPage} of {totalPages}
                </div>

                <Button
                    variant="text"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={classNames("px-3 py-1.5 rounded-full text-white focus:ring-0 focus:outline-none transition-all duration-300", (currentPage === totalPages || totalPages === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600")}
                >
                    &gt;
                </Button>
            </div>
        </div>
    );
};