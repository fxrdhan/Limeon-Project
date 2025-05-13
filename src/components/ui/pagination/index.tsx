import { classNames } from "@/lib/classNames";
import type { PaginationProps } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import React, { useRef, useEffect } from "react";

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

    const prevPageRef = useRef(currentPage);

    useEffect(() => {
        prevPageRef.current = currentPage;
    }, [currentPage]);

    let direction = 0;
    if (currentPage > prevPageRef.current) {
        direction = 1;
    } else if (currentPage < prevPageRef.current) {
        direction = -1;
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 20 : -20,
            opacity: 0,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction > 0 ? -20 : 20,
            opacity: 0,
        }),
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

            <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden">
                <div
                    onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                    className={classNames(
                        "p-2 rounded-full focus:outline-none transition-colors duration-150 cursor-pointer",
                        currentPage === 1
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-blue-100 hover:text-blue-600 transition-all duration-300 ease-in-out"
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

                <div className="flex items-center justify-center min-w-[2rem] h-8 rounded-full bg-blue-500 text-white font-medium shadow-sm px-3 mx-1 overflow-hidden">
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.span
                            key={currentPage}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            className="flex items-center justify-center"
                        >
                            {currentPage}
                        </motion.span>
                    </AnimatePresence>
                </div>

                <div
                    onClick={() =>
                        currentPage < totalPages &&
                        totalPages !== 0 &&
                        onPageChange(currentPage + 1)
                    }
                    className={classNames(
                        "p-2 rounded-full focus:outline-none transition-colors duration-150 cursor-pointer",
                        currentPage === totalPages || totalPages === 0
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-blue-100 hover:text-blue-600 transition-all duration-300 ease-in-out"
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
