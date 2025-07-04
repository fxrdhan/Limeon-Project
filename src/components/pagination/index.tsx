import { classNames } from "@/lib/classNames";
import type { PaginationProps } from "@/types";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import React, { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";

interface FloatingPaginationProps extends PaginationProps {
  enableFloating?: boolean;
}

const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className,
  enableFloating = true,
}: FloatingPaginationProps) => {
  const [showFloating, setShowFloating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleItemsPerPageClick = useCallback(
    (value: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (value !== itemsPerPage) {
        onItemsPerPageChange({
          target: { value: value.toString() },
        } as React.ChangeEvent<HTMLSelectElement>);
      }
    },
    [itemsPerPage, onItemsPerPageChange],
  );

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

  const floatingVariants = {
    initial: { opacity: 0, scale: 0.8, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: 10 },
  };

  const pageSizes = [10, 20, 40];

  const toggleFloating = useCallback(() => {
    if (enableFloating) {
      setShowFloating((prev) => !prev);
    }
  }, [enableFloating]);

  const handleFloatingMouseLeave = useCallback(() => {
    if (enableFloating) {
      setShowFloating(false);
    }
  }, [enableFloating]);

  const PaginationContent = ({
    isFloating = false,
  }: {
    isFloating?: boolean;
  }) => (
    <div
      className={classNames(
        "flex justify-between items-center gap-4 select-none",
        isFloating
          ? "bg-white rounded-lg shadow-2xl border border-gray-200 p-4 backdrop-blur-sm relative"
          : "mt-4",
        !isFloating && className,
      )}
      style={
        isFloating
          ? {
              minWidth: "400px",
            }
          : undefined
      }
      onMouseLeave={isFloating ? handleFloatingMouseLeave : undefined}
    >
      {/* Close Button for Floating */}
      {isFloating && (
        <button
          onClick={toggleFloating}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          title="Close Floating Pagination"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
      <LayoutGroup id={isFloating ? "floating" : "main"}>
        <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none">
          {pageSizes.map((size) => (
            <motion.button
              key={`page-size-${size}-${isFloating ? "floating" : "main"}`}
              layout
              className={classNames(
                "group px-3 py-1.5 rounded-full focus:outline-hidden select-none relative transition-colors duration-300 cursor-pointer",
                itemsPerPage !== size ? "hover:bg-emerald-100" : "",
              )}
              onClick={(event) => handleItemsPerPageClick(size, event)}
              animate={{
                scale: itemsPerPage === size ? 1.05 : 1,
                zIndex: itemsPerPage === size ? 10 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
            >
              <AnimatePresence mode="popLayout">
                {itemsPerPage === size && (
                  <motion.div
                    layoutId={`activeItemsPerPageIndicator-${isFloating ? "floating" : "main"}`}
                    key={`indicator-${itemsPerPage}-${isFloating ? "floating" : "main"}`}
                    className="absolute inset-0 bg-primary rounded-full shadow-xs"
                    style={{ borderRadius: "9999px" }}
                    initial={false}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35,
                      mass: 0.6,
                    }}
                  />
                )}
              </AnimatePresence>
              <span
                className={classNames(
                  "relative z-10 select-none transition-colors duration-300 ease-in-out",
                  itemsPerPage === size
                    ? "text-white font-medium"
                    : "text-gray-700 group-hover:text-emerald-700",
                )}
              >
                {itemsPerPage === size ? `${size} items` : size.toString()}
              </span>
            </motion.button>
          ))}
        </div>
      </LayoutGroup>

      {/* Floating Toggle Button */}
      {enableFloating && !isFloating && (
        <button
          onClick={toggleFloating}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
          title="Toggle Floating Pagination"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
        </button>
      )}

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
              : "hover:bg-emerald-100 hover:text-secondary transition-all duration-300 ease-in-out",
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
              key={`${currentPage}-${isFloating ? "floating" : "main"}`}
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
              : "hover:bg-emerald-100 hover:text-secondary transition-all duration-300 ease-in-out",
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

  return (
    <>
      <div
        ref={containerRef}
        className={classNames(
          "transition-opacity duration-200",
          enableFloating && showFloating ? "opacity-30" : "opacity-100",
        )}
      >
        <PaginationContent />
      </div>

      {enableFloating &&
        showFloating &&
        typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleFloating}
            >
              <motion.div
                variants={floatingVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <PaginationContent isFloating />
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default Pagination;
