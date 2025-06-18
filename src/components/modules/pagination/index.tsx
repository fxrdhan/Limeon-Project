import { classNames } from "@/lib/classNames";
import type { PaginationProps } from "@/types";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import React, { useRef, useEffect } from "react";

const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className,
}: PaginationProps) => {
  const handleItemsPerPageClick = (value: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onItemsPerPageChange({
      target: { value: value.toString() },
    } as React.ChangeEvent<HTMLSelectElement>);
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

  const pageSizes = [10, 20, 40];

  return (
    <div
      className={classNames(
        "flex justify-between items-center mt-4 gap-4 select-none",
        className,
      )}
    >
      <LayoutGroup>
        <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none">
          {pageSizes.map((size) => (
            <motion.button
              key={size}
              layout
              className={classNames(
                "group px-3 py-1.5 rounded-full focus:outline-hidden select-none relative transition-colors duration-300 cursor-pointer",
                itemsPerPage !== size ? "hover:bg-teal-100" : "",
              )}
              onClick={(event) => handleItemsPerPageClick(size, event)}
              animate={{
                scale: itemsPerPage === size ? 1.05 : 1,
                zIndex: itemsPerPage === size ? 10 : 1,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {itemsPerPage === size && (
                <motion.div
                  layoutId="activeItemsPerPageIndicator"
                  className="absolute inset-0 bg-primary rounded-full shadow-xs"
                  style={{ borderRadius: "9999px" }}
                  transition={{ type: "spring", stiffness: 700, damping: 35 }}
                />
              )}
              <span
                className={classNames(
                  "relative z-10 select-none transition-colors duration-300 ease-in-out",
                  itemsPerPage === size
                    ? "text-white font-medium"
                    : "text-gray-700 group-hover:text-teal-700",
                )}
              >
                {itemsPerPage === size ? `${size} items` : size.toString()}
              </span>
            </motion.button>
          ))}
        </div>
      </LayoutGroup>

      <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none">
        <div
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (currentPage > 1) {
              onPageChange(currentPage - 1);
            }
          }}
          className={classNames(
            "p-2 rounded-full focus:outline-hidden transition-colors duration-150 cursor-pointer select-none",
            currentPage === 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-teal-100 hover:text-secondary transition-all duration-300 ease-in-out",
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

        <div className="flex items-center justify-center min-w-8 h-8 rounded-full bg-primary text-white font-medium shadow-xs px-3 mx-1 overflow-hidden select-none">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.span
              key={currentPage}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center justify-center select-none"
            >
              {currentPage}
            </motion.span>
          </AnimatePresence>
        </div>

        <div
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (currentPage < totalPages && totalPages !== 0) {
              onPageChange(currentPage + 1);
            }
          }}
          className={classNames(
            "p-2 rounded-full focus:outline-hidden transition-colors duration-150 cursor-pointer select-none",
            currentPage === totalPages || totalPages === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-teal-100 hover:text-secondary transition-all duration-300 ease-in-out",
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

export default Pagination;
