import { AnimatePresence, motion } from "motion/react";
import React from "react";
import {
  TbAlertCircle,
  TbChartCircles,
  TbFilter,
  TbFilterX,
  TbHash,
  TbSearch,
  TbZoomCancel,
} from "react-icons/tb";
import { SearchState } from "../constants";
import { EnhancedSearchState } from "../types";

interface SearchIconProps {
  mode?: "simple" | "enhanced";
  searchMode?: EnhancedSearchState | null;
  searchState: SearchState;
  displayValue: string;
  showError?: boolean;
}

const SearchIcon: React.FC<SearchIconProps> = ({
  mode = "enhanced",
  searchMode,
  searchState,
  displayValue,
  showError = false,
}) => {
  const resolvedSearchMode = searchMode ?? {
    showColumnSelector: false,
    showOperatorSelector: false,
    showJoinOperatorSelector: false,
    isFilterMode: false,
  };

  // Consolidated active state determination
  // If it should show ANY icon other than the default Search icon, it is "Active"
  const currentIcon = (() => {
    if (mode === "simple") {
      if (searchState === "error") return "search-error";
      if (searchState === "not-found") return "search-not-found";
      return "search";
    }

    if (showError) return "filter-error";
    if (resolvedSearchMode.showColumnSelector) return "hash-purple";
    if (resolvedSearchMode.showJoinOperatorSelector) return "filters-join";
    if (
      resolvedSearchMode.isFilterMode &&
      resolvedSearchMode.filterSearch?.operator === "contains" &&
      !resolvedSearchMode.filterSearch?.isExplicitOperator
    )
      return "hash-dynamic";
    if (
      resolvedSearchMode.isFilterMode ||
      resolvedSearchMode.filterSearch?.isExplicitOperator ||
      resolvedSearchMode.filterSearch?.isMultiCondition ||
      (resolvedSearchMode.showOperatorSelector && resolvedSearchMode.selectedColumn) ||
      (!!resolvedSearchMode.selectedColumn && !resolvedSearchMode.showColumnSelector) ||
      resolvedSearchMode.partialJoin ||
      resolvedSearchMode.partialConditions?.[1]?.operator
    )
      return "filter";
    return "search";
  })();

  // If we are NOT showing the default search icon, we are in Active Mode.
  // This guarantees that Funnel (Filter) and Hash icons always get the "Active" styling.
  // We also consider non-empty input (not starting with #) as active typing mode.
  const isDefaultIcon = currentIcon === "search";
  const isActiveMode =
    mode === "simple"
      ? !!displayValue
      : !isDefaultIcon || (!!displayValue && !displayValue.startsWith("#"));

  const getSearchIconColor = () => {
    if (currentIcon === "search-error") return "#F59E0B";
    if (currentIcon === "search-not-found") return "#EF4444";
    if (currentIcon === "filter-error") return "#EF4444";
    if (currentIcon === "hash-purple") return "#A855F7"; // text-purple-500
    if (currentIcon === "hash-dynamic") return "#A855F7"; // text-purple-500
    if (currentIcon === "filters-join") return "#F97316"; // text-orange-500
    if (currentIcon === "filter" || resolvedSearchMode.isFilterMode) return "#3B82F6"; // text-blue-500

    switch (searchState) {
      case "idle":
        return "#9CA3AF"; // text-slate-400
      case "typing":
        return "#1F2937"; // text-slate-800
      case "found":
        return "#10B981"; // text-primary
      case "not-found":
        return "#EF4444"; // text-red-500
      default:
        return "#9CA3AF";
    }
  };

  const renderIcon = () => {
    switch (currentIcon) {
      case "hash-purple":
      case "hash-dynamic":
        return <TbHash />;
      case "filters-join":
        return <TbChartCircles />;
      case "filter":
        return <TbFilter />;
      case "filter-error":
        return <TbFilterX />;
      case "search-error":
        return <TbAlertCircle />;
      case "search-not-found":
        return <TbZoomCancel />;
      default:
        return <TbSearch />;
    }
  };

  const renderAnimatedGlyph = () => (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIcon}
        initial={{ opacity: 0, scale: 0.985, filter: "blur(2px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.985, filter: "blur(2px)" }}
        transition={{ duration: 0.09, ease: "easeOut" }}
        className="flex items-center justify-center w-full h-full"
      >
        {renderIcon()}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      <motion.div
        className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center"
        initial={false}
        animate={{
          opacity: isActiveMode ? 0 : 1,
          scale: isActiveMode ? 0.85 : 1,
          x: isActiveMode ? 8 : 0,
          color: getSearchIconColor(),
        }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 28,
          color: {
            duration: 0.12,
            ease: "easeOut",
          },
        }}
      >
        {renderAnimatedGlyph()}
      </motion.div>

      <motion.div
        layout
        className="flex h-6 flex-shrink-0 items-center justify-center overflow-hidden"
        initial={false}
        animate={{
          width: isActiveMode ? 36 : 0,
          opacity: isActiveMode ? 1 : 0,
          scale: isActiveMode ? 1.6 : 1,
          x: isActiveMode ? 2 : -6,
          color: getSearchIconColor(),
          marginLeft: isActiveMode ? 4 : 0,
          marginRight: isActiveMode ? 12 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 28,
          color: {
            duration: 0.12,
            ease: "easeOut",
          },
        }}
      >
        {renderAnimatedGlyph()}
      </motion.div>
    </>
  );
};

export default SearchIcon;
