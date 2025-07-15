import type { ColumnConfig, SortDirection } from "@/types/table";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableData = any;

export const calculateColumnWidths = (
  columns: ColumnConfig[],
  data: TableData[],
  containerWidth: number,
) => {
  const widths: Record<string, number> = {};
  const ratios: Record<string, number> = {};

  let totalRatio = 0;

  // Hitung rasio ideal untuk setiap kolom berdasarkan rata-rata + percentile
  columns.forEach((column) => {
    const headerLength = column.header.length;

    // Kumpulkan semua panjang konten dalam kolom ini
    const contentLengths: number[] = [];

    data.forEach((row) => {
      const cellContent = row[column.key];
      let contentLength = 0;

      if (cellContent !== null && cellContent !== undefined) {
        if (typeof cellContent === "number") {
          contentLength = cellContent.toLocaleString("id-ID").length;
        } else if (
          typeof cellContent === "object" &&
          cellContent !== null &&
          "name" in cellContent
        ) {
          contentLength = String((cellContent as { name: string }).name).length;
        } else if (Array.isArray(cellContent)) {
          contentLength = cellContent
            .map((item) =>
              typeof item === "object" && item !== null && "name" in item
                ? (item as { name: string }).name
                : String(item),
            )
            .join(", ").length;
        } else {
          contentLength = String(cellContent).length;
        }
      }

      contentLengths.push(contentLength);
    });

    // Hitung statistik
    const sortedLengths = contentLengths.sort((a, b) => a - b);
    const avgLength =
      contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length;

    // Gunakan percentile 75% agar tidak terlalu dipengaruhi outlier
    const p75Index = Math.floor(sortedLengths.length * 0.75);
    const p75Length = sortedLengths[p75Index] || 0;

    // Gunakan yang lebih kecil antara rata-rata*1.2 atau p75, tapi min 6 karakter
    const smartContentLength = Math.max(
      Math.min(avgLength * 1.2, p75Length),
      6,
    );

    // Bandingkan dengan header length
    const idealLength = Math.max(headerLength, smartContentLength);
    const ratio = Math.max(idealLength, 6); // Minimum ratio 6 karakter

    ratios[column.key] = ratio;
    totalRatio += ratio;
  });

  // Available width dikurangi padding dan margin
  const availableWidth = Math.max(containerWidth - 60, 300); // Minimum 300px

  // Hitung lebar proporsional
  let totalCalculatedWidth = 0;
  const tempWidths: Record<string, number> = {};

  columns.forEach((column) => {
    const proportionalWidth =
      (ratios[column.key] / totalRatio) * availableWidth;

    let finalWidth = proportionalWidth;

    // Apply min/max constraints
    if (column.minWidth) finalWidth = Math.max(finalWidth, column.minWidth);
    if (column.maxWidth) finalWidth = Math.min(finalWidth, column.maxWidth);

    tempWidths[column.key] = finalWidth;
    totalCalculatedWidth += finalWidth;
  });

  // Jika total width melebihi available width, scale down secara proporsional
  if (totalCalculatedWidth > availableWidth) {
    const scaleFactor = availableWidth / totalCalculatedWidth;
    columns.forEach((column) => {
      let scaledWidth = tempWidths[column.key] * scaleFactor;

      // Pastikan tidak kurang dari minimum absolut (40px)
      scaledWidth = Math.max(scaledWidth, 40);

      // Re-apply minWidth constraint jika masih memungkinkan
      if (column.minWidth && scaledWidth < column.minWidth) {
        const minWidthTotal = columns.reduce((sum, col) => {
          return sum + (col.minWidth || 40);
        }, 0);

        // Jika total minWidth masih bisa difit, gunakan minWidth
        if (minWidthTotal <= availableWidth) {
          scaledWidth = column.minWidth;
        }
      }

      widths[column.key] = Math.floor(scaledWidth);
    });
  } else {
    // Jika masih ada sisa space, distribusikan secara merata
    const remainingSpace = availableWidth - totalCalculatedWidth;
    const spacePerColumn = remainingSpace / columns.length;

    columns.forEach((column) => {
      widths[column.key] = Math.floor(tempWidths[column.key] + spacePerColumn);
    });
  }

  return widths;
};

export const filterData = (
  data: TableData[],
  columnSearches: Record<string, string>,
  columns: ColumnConfig[],
): TableData[] => {
  if (!columnSearches || !columns || Object.keys(columnSearches).length === 0) return data;

  return data.filter((row) => {
    return Object.entries(columnSearches).every(([columnKey, searchTerm]) => {
      if (!searchTerm.trim()) return true;
      
      const value = row[columnKey];
      if (value == null) return false;
      
      let searchableValue = "";
      if (typeof value === "number") {
        searchableValue = value.toLocaleString("id-ID");
      } else if (typeof value === "object" && value !== null && "name" in value) {
        searchableValue = String((value as { name: string }).name);
      } else if (Array.isArray(value)) {
        searchableValue = value
          .map((item) =>
            typeof item === "object" && item !== null && "name" in item
              ? (item as { name: string }).name
              : String(item),
          )
          .join(", ");
      } else {
        searchableValue = String(value);
      }
      
      return searchableValue.toLowerCase().includes(searchTerm.toLowerCase());
    });
  });
};

export const sortData = (
  data: TableData[],
  column: string,
  direction: SortDirection,
  originalData: TableData[],
): TableData[] => {
  if (direction === "original") {
    return [...originalData];
  }

  return [...data].sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];

    if (aVal === null || aVal === undefined) aVal = "";
    if (bVal === null || bVal === undefined) bVal = "";

    if (typeof aVal === "object" && aVal !== null && "name" in aVal) {
      aVal = (aVal as { name: string }).name;
    }
    if (typeof bVal === "object" && bVal !== null && "name" in bVal) {
      bVal = (bVal as { name: string }).name;
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (direction === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
};