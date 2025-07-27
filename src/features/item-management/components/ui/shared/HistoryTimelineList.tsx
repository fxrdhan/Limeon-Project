import React, { useState, useRef, useEffect } from "react";
import { FaHistory } from "react-icons/fa";
import Button from "@/components/button";
import { formatDateTime } from "@/lib/formatters";

export interface HistoryItem {
  id: string;
  version_number: number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_fields?: Record<string, unknown>;
}

interface HistoryTimelineListProps {
  history: HistoryItem[] | null;
  isLoading: boolean;
  onVersionClick: (item: HistoryItem) => void;
  selectedVersions?: number[];
  selectedVersion?: number | null;
  showRestoreButton?: boolean;
  onRestore?: (version: number) => void;
  emptyMessage?: string;
  loadingMessage?: string;
}

const HistoryTimelineList: React.FC<HistoryTimelineListProps> = ({
  history,
  isLoading,
  onVersionClick,
  selectedVersions = [],
  selectedVersion = null,
  showRestoreButton = false,
  onRestore,
  emptyMessage = "Tidak ada riwayat perubahan",
  loadingMessage = "Loading history..."
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState({ canScrollUp: false, canScrollDown: false });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Find the latest version number (current version should not have restore button)
  const latestVersion = history ? Math.max(...history.map(h => h.version_number)) : 0;

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop < scrollHeight - clientHeight - 1;
    
    setScrollState({ canScrollUp, canScrollDown });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check initial scroll position
    checkScrollPosition();

    // Add scroll listener
    container.addEventListener('scroll', checkScrollPosition);
    
    // Check when content changes
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [history]);

  const handleRestore = (e: React.MouseEvent, version: number) => {
    e.stopPropagation();
    if (onRestore) {
      onRestore(version);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-500">{loadingMessage}</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <FaHistory size={48} className="mx-auto mb-4 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="relative">
        {/* Top fade overlay */}
        {scrollState.canScrollUp && (
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}
        
        {/* Bottom fade overlay */}
        {scrollState.canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
        )}
        
        <div 
          ref={scrollContainerRef}
          className="space-y-2 max-h-96 overflow-y-auto"
        >
          {history.map((item) => (
            <div
              key={item.id}
              className={`border-l-4 pl-4 py-2 cursor-pointer transition-all duration-200 ${
                selectedVersions.includes(item.version_number)
                  ? "border-l-blue-500 bg-blue-50"
                  : selectedVersion === item.version_number
                  ? "border-l-green-500 bg-green-50"
                  : "border-l-gray-200 hover:border-l-blue-400 hover:bg-gray-50"
              }`}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => onVersionClick(item)}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    item.action_type === 'INSERT' ? 'bg-green-100 text-green-700' :
                    item.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.action_type}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {formatDateTime(item.changed_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                    v{item.version_number}
                  </span>
                  {showRestoreButton && item.version_number < latestVersion && onRestore && (
                    <Button
                      variant="text"
                      size="sm"
                      onClick={(e) => handleRestore(e, item.version_number)}
                      className="text-orange-600 hover:text-orange-700 p-1"
                      title="Restore ke versi ini"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  hoveredItem === item.id && item.changed_fields 
                    ? 'max-h-20 opacity-100 mt-2' 
                    : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                {item.changed_fields && (
                  <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded transform transition-transform duration-300 ease-in-out">
                    <span className="font-medium">Changed fields:</span> {Object.keys(item.changed_fields).join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryTimelineList;