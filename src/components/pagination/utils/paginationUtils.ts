/**
 * Utility functions for pagination calculations and helpers
 */

export const paginationUtils = {
  /**
   * Calculate total pages based on total items and items per page
   */
  calculateTotalPages: (totalItems: number, itemsPerPage: number): number => {
    if (itemsPerPage <= 0) return 0;
    return Math.ceil(totalItems / itemsPerPage);
  },

  /**
   * Calculate the start and end item indices for current page
   */
  calculateItemRange: (
    currentPage: number,
    itemsPerPage: number
  ): { start: number; end: number } => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = currentPage * itemsPerPage;
    return { start, end };
  },

  /**
   * Check if a page number is valid
   */
  isValidPage: (page: number, totalPages: number): boolean => {
    return page >= 1 && page <= totalPages;
  },

  /**
   * Clamp a page number to valid range
   */
  clampPage: (page: number, totalPages: number): number => {
    return Math.max(1, Math.min(page, totalPages));
  },

  /**
   * Calculate offset for database queries
   */
  calculateOffset: (currentPage: number, itemsPerPage: number): number => {
    return (currentPage - 1) * itemsPerPage;
  },
};
