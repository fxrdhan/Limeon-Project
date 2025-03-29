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
            <div className="flex items-center rounded-full bg-primary shadow-md text-white overflow-hidden">
                <button 
                    className={classNames(
                        "px-3 py-1.5 focus:outline-none transition-colors", 
                        itemsPerPage === 10 ? "bg-blue-600" : "hover:bg-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(10)}
                >
                    10 Items
                </button>
                <button 
                    className={classNames(
                        "px-3 py-1.5 focus:outline-none transition-colors", 
                        itemsPerPage === 20 ? "bg-blue-600" : "hover:bg-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(20)}
                >
                    20
                </button>
                <button 
                    className={classNames(
                        "px-3 py-1.5 focus:outline-none transition-colors", 
                        itemsPerPage === 40 ? "bg-blue-600" : "hover:bg-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(40)}
                >
                    40
                </button>
            </div>

            {/* Page navigation - right side */}
            <div className="flex items-center rounded-full bg-primary shadow-md text-white overflow-hidden">
                <Button
                    variant="text"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-white hover:bg-blue-600 focus:ring-0 focus:outline-none"
                >
                    &lt;
                </Button>

                <div className="px-3 py-1.5">
                    {currentPage} of {totalPages}
                </div>

                <Button
                    variant="text"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1.5 text-white hover:bg-blue-600 focus:ring-0 focus:outline-none"
                >
                    &gt;
                </Button>
            </div>
        </div>
    );
};