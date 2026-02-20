import { useEffect } from 'react';
import { UseFieldFocusOptions } from '@/types';

const isChatSidebarOpen = () =>
  typeof document !== 'undefined' &&
  Boolean(document.querySelector('[data-chat-sidebar-open="true"]'));

export const useFieldFocus = (options: UseFieldFocusOptions = {}) => {
  const {
    searchInputRef,
    isModalOpen = false,
    isLoading = false,
    isFetching = false,
    debouncedSearch,
    locationKey,
  } = options;

  useEffect(() => {
    if (
      searchInputRef?.current &&
      !isModalOpen &&
      !isLoading &&
      !isFetching &&
      !isChatSidebarOpen()
    ) {
      requestAnimationFrame(() => {
        if (searchInputRef.current && !isModalOpen && !isChatSidebarOpen()) {
          searchInputRef.current.focus({ preventScroll: true });
        }
      });
    }
  }, [
    isModalOpen,
    isLoading,
    isFetching,
    debouncedSearch,
    searchInputRef,
    locationKey,
  ]);

  useEffect(() => {
    const handlePageClick = (event: MouseEvent) => {
      if (isModalOpen || !searchInputRef?.current) return;
      if (isChatSidebarOpen()) return;

      const target = event.target as HTMLElement;
      if (target.closest('[data-chat-sidebar-open="true"]')) return;

      if (searchInputRef.current.contains(target)) {
        return;
      }

      // Check if clicking inside table or any input/interactive element
      if (
        target.closest(
          'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [tabindex="0"]'
        ) ||
        target.closest('table') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON'
      ) {
        return;
      }

      if (document.activeElement !== searchInputRef.current) {
        searchInputRef.current?.focus({ preventScroll: true });
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isModalOpen && searchInputRef?.current) {
        if (isChatSidebarOpen()) return;

        const relatedTarget = event.relatedTarget as HTMLElement;
        if (relatedTarget?.closest('[data-chat-sidebar-open="true"]')) return;

        // Don't refocus if moving to table input or other interactive elements
        if (
          relatedTarget &&
          (relatedTarget.closest('table') ||
            relatedTarget.tagName === 'INPUT' ||
            relatedTarget.tagName === 'TEXTAREA' ||
            relatedTarget.tagName === 'SELECT' ||
            relatedTarget.tagName === 'BUTTON')
        ) {
          return;
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (
              searchInputRef.current &&
              !isModalOpen &&
              !isChatSidebarOpen()
            ) {
              searchInputRef.current.focus({ preventScroll: true });
            }
          });
        });
      }
    };

    document.addEventListener('click', handlePageClick);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('click', handlePageClick);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [isModalOpen, searchInputRef]);
};
