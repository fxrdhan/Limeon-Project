import { classNames } from "@/lib/classNames";
import type { PaginationProps } from "@/types";

export const Pagination = ({
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    className,
}: PaginationProps) => {
    const handleItemsPerPageClick = (value: number) => {
        const event = {
            target: { value: value.toString() },
        } as React.ChangeEvent<HTMLSelectElement>;
        onItemsPerPageChange(event);
    };

    return (
        <div
            className={classNames(
                "flex justify-between items-center mt-4 gap-4",
                className
            )}
        >
            <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden">
                <button
                    className={classNames(
                        "px-3 py-1.5 rounded-full focus:outline-none transition-all duration-300 ease-in-out",
                        itemsPerPage === 10
                            ? "bg-blue-500 text-white font-medium shadow-sm transform scale-105"
                            : "hover:bg-blue-100 hover:text-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(10)}
                >
                    {itemsPerPage === 10 ? "10 items" : "10"}
                </button>
                <button
                    className={classNames(
                        "px-3 py-1.5 rounded-full focus:outline-none transition-all duration-300 ease-in-out",
                        itemsPerPage === 20
                            ? "bg-blue-500 text-white font-medium shadow-sm transform scale-105"
                            : "hover:bg-blue-100 hover:text-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(20)}
                >
                    {itemsPerPage === 20 ? "20 items" : "20"}
                </button>
                <button
                    className={classNames(
                        "px-3 py-1.5 rounded-full focus:outline-none transition-all duration-300 ease-in-out",
                        itemsPerPage === 40
                            ? "bg-blue-500 text-white font-medium shadow-sm transform scale-105"
                            : "hover:bg-blue-100 hover:text-blue-600"
                    )}
                    onClick={() => handleItemsPerPageClick(40)}
                >
                    {itemsPerPage === 40 ? "40 items" : "40"}
                </button>
            </div>

            <div className="flex items-center space-x-2">
                <div
                    onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                    className={classNames(
                        "p-2 rounded-md focus:outline-none transition-colors duration-150 cursor-pointer",
                        currentPage === 1
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-200 text-gray-700 hover:text-gray-900"
                    )}
                    aria-label="Halaman sebelumnya"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>

                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-semibold text-sm shadow">
                    {currentPage}
                </div>

                <div
                    onClick={() =>
                        currentPage < totalPages &&
                        totalPages !== 0 &&
                        onPageChange(currentPage + 1)
                    }
                    className={classNames(
                        "p-2 rounded-md focus:outline-none transition-colors duration-150 cursor-pointer",
                        currentPage === totalPages || totalPages === 0
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-200 text-gray-700 hover:text-gray-900"
                    )}
                    aria-label="Halaman berikutnya"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
};
