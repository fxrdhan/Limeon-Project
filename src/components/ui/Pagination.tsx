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
    totalItems,
    itemsPerPage,
    itemsCount,
    onPageChange,
    onItemsPerPageChange,
    className,
}: PaginationProps) => {
    const pageNumbers = [];
    const maxPageDisplay = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPageDisplay / 2));
    const endPage = Math.min(totalPages, startPage + maxPageDisplay - 1);

    if (endPage - startPage + 1 < maxPageDisplay) {
        startPage = Math.max(1, endPage - maxPageDisplay + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className={classNames("flex justify-between items-center mt-4", className)}>
            <div className="text-sm text-gray-600">
                Menampilkan {itemsCount} dari {totalItems} item
            </div>

            <div className="flex items-center">
                <div className="mr-4">
                    <select
                        value={itemsPerPage}
                        onChange={onItemsPerPageChange}
                        className="border rounded-md p-2"
                    >
                        <option value={5}>5 per halaman</option>
                        <option value={10}>10 per halaman</option>
                        <option value={20}>20 per halaman</option>
                        <option value={50}>50 per halaman</option>
                    </select>
                </div>

                <div className="flex">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="mx-1"
                    >
                        &laquo;
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="mx-1"
                    >
                        &lt;
                    </Button>

                    {pageNumbers.map(number => (
                        <Button
                            key={number}
                            variant={currentPage === number ? "primary" : "outline"}
                            size="sm"
                            onClick={() => onPageChange(number)}
                            className="mx-1"
                        >
                            {number}
                        </Button>
                    ))}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="mx-1"
                    >
                        &gt;
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="mx-1"
                    >
                        &raquo;
                    </Button>
                </div>
            </div>
        </div>
    );
};