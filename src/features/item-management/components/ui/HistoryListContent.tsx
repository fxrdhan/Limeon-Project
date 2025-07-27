import React, { useState, useRef, useEffect } from "react";
import { FaHistory } from "react-icons/fa";
import { useEntityModal, VersionData } from "../../contexts/EntityModalContext";
import { useEntityHistory } from "../../hooks/useEntityHistory";
import { formatDateTime } from "@/lib/formatters";

const HistoryListContent: React.FC = () => {
  const { history: historyState, uiActions } = useEntityModal();
  const { entityTable, entityId } = historyState;
  const { history, isLoading } = useEntityHistory(entityTable, entityId);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState({ canScrollUp: false, canScrollDown: false });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleVersionClick = (version: VersionData) => {
    uiActions.openComparison(version);
  };

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

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading history...</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <FaHistory size={48} className="mx-auto mb-4 opacity-30" />
        <p>Tidak ada riwayat perubahan</p>
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
              className="border-l-4 border-l-gray-200 pl-4 py-2 hover:border-l-blue-400 hover:bg-gray-50 cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => handleVersionClick(item)}
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
                <span className="font-mono text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                  v{item.version_number}
                </span>
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

export default HistoryListContent;