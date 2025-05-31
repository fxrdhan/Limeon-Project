import { useEffect } from "react";
import { UseFieldFocusOptions } from "@/types";

export const useFieldFocus = (options: UseFieldFocusOptions = {}) => {
    const {
        searchInputRef,
        isModalOpen = false,
        isLoading = false,
        isFetching = false,
        debouncedSearch,
        currentPage,
        itemsPerPage,
        locationKey,
    } = options;

    useEffect(() => {
        if (
            searchInputRef?.current &&
            !isModalOpen &&
            !isLoading &&
            !isFetching
        ) {
            requestAnimationFrame(() => {
                if (searchInputRef.current && !isModalOpen) {
                    searchInputRef.current.focus();
                }
            });
        }
    }, [
        isModalOpen,
        isLoading,
        isFetching,
        debouncedSearch,
        currentPage,
        itemsPerPage,
        searchInputRef,
        locationKey,
    ]);

    useEffect(() => {
        const handlePageClick = (event: MouseEvent) => {
            if (isModalOpen || !searchInputRef?.current) return;

            const target = event.target as HTMLElement;

            if (searchInputRef.current.contains(target)) {
                return;
            }

            if (
                target.closest(
                    'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [tabindex="0"]'
                )
            ) {
                return;
            }

            if (document.activeElement !== searchInputRef.current) {
                searchInputRef.current?.focus();
            }
        };

        const handleFocusOut = () => {
            if (!isModalOpen && searchInputRef?.current) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (searchInputRef.current && !isModalOpen) {
                            searchInputRef.current.focus();
                        }
                    });
                });
            }
        };

        document.addEventListener("click", handlePageClick);
        document.addEventListener("focusout", handleFocusOut);

        return () => {
            document.removeEventListener("click", handlePageClick);
            document.removeEventListener("focusout", handleFocusOut);
        };
    }, [isModalOpen, searchInputRef]);
};
