import React, { useEffect, useRef, useState } from "react";
import fuzzysort from "fuzzysort";
import { SearchColumn, ColumnSelectorProps } from "@/types/search";
import { LuHash, LuSearch, LuFilter } from "react-icons/lu";
import { HiOutlineSparkles } from "react-icons/hi2";

type AnimationPhase = "hidden" | "header" | "footer" | "content" | "complete";

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = "",
}) => {
  const [filteredColumns, setFilteredColumns] =
    useState<SearchColumn[]>(columns);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("hidden");
  const modalRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Animation sequence effect
  useEffect(() => {
    if (isOpen && animationPhase === "hidden") {
      // Start animation sequence
      setAnimationPhase("header");
      
      // Show footer after header
      setTimeout(() => {
        setAnimationPhase("footer");
      }, 150);
      
      // Show content after footer
      setTimeout(() => {
        setAnimationPhase("content");
      }, 300);
      
      // Mark as complete
      setTimeout(() => {
        setAnimationPhase("complete");
      }, 650);
    } else if (!isOpen && animationPhase !== "hidden") {
      // Reset animation when closing
      setAnimationPhase("hidden");
    }
  }, [isOpen, animationPhase]);

  useEffect(() => {
    if (searchTerm) {
      // Prepare search targets for fuzzysort
      const searchTargets = columns.map(col => ({
        column: col,
        headerName: col.headerName,
        field: col.field,
        description: col.description || ''
      }));
      
      // Search header names (highest priority)
      const headerResults = fuzzysort.go(searchTerm, searchTargets, {
        key: 'headerName',
        threshold: -1000
      });
      
      // Search field names (medium priority)
      const fieldResults = fuzzysort.go(searchTerm, searchTargets, {
        key: 'field', 
        threshold: -1000
      });
      
      // Search descriptions (lowest priority)
      const descResults = fuzzysort.go(searchTerm, searchTargets, {
        key: 'description',
        threshold: -1000
      });
      
      // Combine results with priority scoring
      const combinedResults = new Map();
      
      headerResults.forEach(result => {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score + 1000 // Boost header matches
        });
      });
      
      fieldResults.forEach(result => {
        if (!combinedResults.has(result.obj.column.field)) {
          combinedResults.set(result.obj.column.field, {
            column: result.obj.column,
            score: result.score + 500 // Medium boost
          });
        }
      });
      
      descResults.forEach(result => {
        if (!combinedResults.has(result.obj.column.field)) {
          combinedResults.set(result.obj.column.field, {
            column: result.obj.column,
            score: result.score // No boost
          });
        }
      });
      
      // Sort by score and extract columns
      const filtered = Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .map(item => item.column);
        
      setFilteredColumns(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredColumns(columns);
      setSelectedIndex(0);
    }
  }, [searchTerm, columns]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || animationPhase !== "complete") return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredColumns.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredColumns.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredColumns[selectedIndex]) {
            onSelect(filteredColumns[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, animationPhase, filteredColumns, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (isOpen && animationPhase === "complete" && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, isOpen, animationPhase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen && animationPhase === "complete") {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, animationPhase, onClose]);

  // Don't render if not open
  if (!isOpen && animationPhase === "hidden") return null;

  const getColumnIcon = (column: SearchColumn) => {
    switch (column.type) {
      case "number":
      case "currency":
        return <LuHash className="w-3 h-3 text-blue-500" />;
      case "date":
        return <LuFilter className="w-3 h-3 text-purple-500" />;
      default:
        return <LuSearch className="w-3 h-3 text-purple-500" />;
    }
  };

  return (
    <div
      ref={modalRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 min-w-80 flex flex-col"
      style={{
        top: position.top + 5,
        left: position.left,
      }}
    >
      {/* Header - fades in first */}
      <div 
        className={`flex-shrink-0 bg-white border-b border-gray-100 px-3 py-2 rounded-t-lg transition-opacity duration-300 ${
          animationPhase === "hidden" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <HiOutlineSparkles className="w-3 h-3" />
          <span>Pilih kolom untuk pencarian targeted</span>
        </div>
      </div>

      {/* Content - appears last with smooth slide and fade */}
      <div 
        className={`flex-1 overflow-y-auto min-h-0 transition-all duration-500 ease-out ${
          animationPhase === "hidden" || animationPhase === "header" || animationPhase === "footer" 
            ? "opacity-0 max-h-0" 
            : "opacity-100 max-h-64"
        }`}
        style={{
          transform: animationPhase === "hidden" || animationPhase === "header" || animationPhase === "footer" 
            ? "translateY(-10px)" 
            : "translateY(0px)"
        }}
      >
        {filteredColumns.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            Tidak ada kolom yang ditemukan untuk "{searchTerm}"
          </div>
        ) : (
          <div className="py-2">
            {filteredColumns.map((column, index) => (
              <div
                key={column.field}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className={`px-3 py-2 cursor-pointer flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                  index === selectedIndex
                    ? "bg-purple-100 border-r-2 border-purple-500 hover:bg-purple-50"
                    : ""
                }`}
                onClick={() => animationPhase === "complete" && onSelect(column)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getColumnIcon(column)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        index === selectedIndex
                          ? "text-purple-700"
                          : "text-gray-900"
                      }`}
                    >
                      {column.headerName}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {column.field}
                    </span>
                  </div>
                  {column.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {column.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - fades in second */}
      <div 
        className={`flex-shrink-0 bg-gray-50 border-t border-gray-100 px-3 py-2 rounded-b-lg transition-opacity duration-300 ${
          animationPhase === "hidden" || animationPhase === "header" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ navigasi • Enter pilih • Esc tutup</span>
          <span>{filteredColumns.length} kolom</span>
        </div>
      </div>
    </div>
  );
};

export default ColumnSelector;
