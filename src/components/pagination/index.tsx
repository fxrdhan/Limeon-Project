import classNames from "classnames";
import type { PaginationProps } from "@/types";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { createPortal } from "react-dom";

interface FloatingPaginationProps extends PaginationProps {
  enableFloating?: boolean;
  hideFloatingWhenModalOpen?: boolean;
}

const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className,
  enableFloating = true,
  hideFloatingWhenModalOpen = false,
}: FloatingPaginationProps) => {
  const [showFloating, setShowFloating] = useState(false);
  const [selectedPageSizeIndex, setSelectedPageSizeIndex] = useState(0);
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
    initial: { scale: 0.8, y: 200 },
    animate: {
      scale: 1,
      y: 0,
    },
    exit: { scale: 0.8, y: 200 },
  };

  const pageSizes = useMemo(() => [10, 20, 50, 100], []);

  useEffect(() => {
    const currentIndex = pageSizes.indexOf(itemsPerPage);
    setSelectedPageSizeIndex(currentIndex !== -1 ? currentIndex : 0);
  }, [itemsPerPage, pageSizes]);

  useEffect(() => {
    if (!enableFloating || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloating(!entry.isIntersecting);
      },
      {
        threshold: 0.5,
        rootMargin: "0px",
      },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [enableFloating]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!showFloating) return;

      switch (event.key) {
        case "ArrowUp": {
          event.preventDefault();
          const nextIndex =
            selectedPageSizeIndex < pageSizes.length - 1
              ? selectedPageSizeIndex + 1
              : 0;
          setSelectedPageSizeIndex(nextIndex);
          onItemsPerPageChange({
            target: { value: pageSizes[nextIndex].toString() },
          } as React.ChangeEvent<HTMLSelectElement>);
          break;
        }
        case "ArrowDown": {
          event.preventDefault();
          const prevIndex =
            selectedPageSizeIndex > 0
              ? selectedPageSizeIndex - 1
              : pageSizes.length - 1;
          setSelectedPageSizeIndex(prevIndex);
          onItemsPerPageChange({
            target: { value: pageSizes[prevIndex].toString() },
          } as React.ChangeEvent<HTMLSelectElement>);
          break;
        }
        case "ArrowLeft":
          event.preventDefault();
          if (currentPage > 1) {
            onPageChange(currentPage - 1);
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (currentPage < totalPages && totalPages !== 0) {
            onPageChange(currentPage + 1);
          }
          break;
      }
    },
    [
      showFloating,
      selectedPageSizeIndex,
      pageSizes,
      currentPage,
      totalPages,
      onItemsPerPageChange,
      onPageChange,
    ],
  );

  useEffect(() => {
    if (showFloating) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showFloating, handleKeyDown]);

  const PaginationContent = ({
    isFloating = false,
  }: {
    isFloating?: boolean;
  }) => (
    <div
      className={classNames(
        "flex justify-between items-center gap-4 select-none",
        isFloating ? "rounded-full shadow-2xl p-4 relative" : "mt-4",
        !isFloating && className,
      )}
      style={
        isFloating
          ? {
              minWidth: "400px",
              background: "oklch(1 0 57 / 30%)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              willChange: "transform",
            }
          : undefined
      }
    >
      <LayoutGroup id={isFloating ? "floating-selector" : "main-selector"}>
        <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative">
          {pageSizes.map((size) => (
            <button
              key={`page-size-${size}-${isFloating ? "floating" : "main"}`}
              className={classNames(
                "group px-3 py-1.5 rounded-full focus:outline-hidden select-none relative cursor-pointer z-10",
                itemsPerPage !== size ? "hover:bg-emerald-100" : "",
              )}
              onClick={(event) => handleItemsPerPageClick(size, event)}
            >
              {itemsPerPage === size && (
                <motion.div
                  layoutId={`selector-bg-${isFloating ? "floating" : "main"}`}
                  className="absolute inset-0 bg-primary rounded-full shadow-xs"
                  style={{ borderRadius: "9999px" }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    duration: 0.3,
                  }}
                />
              )}
              <span
                className={classNames(
                  "relative z-10 select-none",
                  itemsPerPage === size
                    ? "text-white font-medium"
                    : "text-gray-700 group-hover:text-emerald-700",
                )}
              >
                {itemsPerPage === size ? `${size} items` : size.toString()}
              </span>
            </button>
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
          showFloating && !hideFloatingWhenModalOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <PaginationContent />
      </div>

      {enableFloating &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9998] flex items-end justify-center pb-8 pointer-events-none">
            <AnimatePresence>
              {showFloating && !hideFloatingWhenModalOpen && (
                <motion.div
                  key="floating-pagination"
                  variants={floatingVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    duration: 0.3,
                  }}
                  className="pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backfaceVisibility: "hidden",
                    perspective: 1000,
                  }}
                >
                  <PaginationContent isFloating />
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Pagination;
