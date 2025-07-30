import React, { useState, useEffect } from "react";
import { createCharacterDiff, createWordDiff, createSmartDiff, DiffSegment } from "@/utils/diff";
import { analyzeDiff } from "@/services/api/diff.service";
import { ComparisonSkeleton } from "../atoms";

interface LocalDiffTextProps {
  oldText: string;
  newText: string;
  mode?: "character" | "word" | "smart";
  className?: string;
  isFlipped?: boolean;
}

const DiffText: React.FC<LocalDiffTextProps> = ({
  oldText,
  newText,
  mode = "smart",
  className = "",
  isFlipped = false,
}) => {
  const [segments, setSegments] = useState<DiffSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const computeDiff = async () => {
      // Reset state
      setError(null);
      setIsLoading(true);

      try {
        if (mode === "smart") {
          // Try server-side diff analysis first
          try {
            const result = await analyzeDiff(oldText, newText);
            setSegments(result.segments);
            console.log(`✅ Server-side diff completed in ${result.meta.processingTime}ms ${result.meta.fromCache ? '(cached)' : '(computed)'}`);
            return;
          } catch (serverError) {
            console.warn('Server-side diff failed, falling back to client-side:', serverError);
            setError('Server analysis failed, using local processing');
            
            // Fallback to client-side
            const clientSegments = createSmartDiff(oldText, newText);
            setSegments(clientSegments);
            return;
          }
        }

        // Client-side processing for character/word modes or smart fallback
        const clientSegments = 
          mode === "character"
            ? createCharacterDiff(oldText, newText)
            : mode === "word"
            ? createWordDiff(oldText, newText)
            : createSmartDiff(oldText, newText);
        
        setSegments(clientSegments);
      } catch (error) {
        console.error('Diff computation failed:', error);
        setError('Failed to compute differences');
        // Show unchanged text as fallback
        setSegments([{ type: 'unchanged', text: newText }]);
      } finally {
        setIsLoading(false);
      }
    };

    computeDiff();
  }, [oldText, newText, mode]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <ComparisonSkeleton lines={1} />
      </div>
    );
  }

  // Error state (still show the diff with warning)
  const showError = error && mode === "smart";

  // Helper function to get segment styling with flip support for colors only
  const getSegmentStyle = (type: 'added' | 'removed' | 'unchanged') => {
    if (type === 'unchanged') {
      return {
        className: "text-gray-800",
        style: {},
        title: ""
      };
    }
    
    // Flip logic: hanya balik warna highlight, data tetap sama
    const isAddedType = type === 'added';
    const shouldShowGreen = isFlipped ? !isAddedType : isAddedType;
    
    if (shouldShowGreen) {
      return {
        className: "bg-green-400 text-gray-900 py-0.5 font-medium",
        style: { backgroundColor: "#4ade80" },
        title: isFlipped ? "Dihapus" : "Ditambahkan"
      };
    } else {
      return {
        className: "bg-red-400 text-gray-900 py-0.5 font-medium",
        style: { backgroundColor: "#f87171" },
        title: isFlipped ? "Ditambahkan" : "Dihapus"
      };
    }
  };

  return (
    <span className={`font-mono text-sm ${className}`}>
      {showError && (
        <span className="text-xs text-amber-600 block mb-1" title={error || ''}>
          ⚠️ Fallback mode
        </span>
      )}
      {segments.map((segment, index) => {
        const segmentStyle = getSegmentStyle(segment.type as 'added' | 'removed' | 'unchanged');
        
        return (
          <span
            key={index}
            className={segmentStyle.className}
            title={segmentStyle.title}
            style={segmentStyle.style}
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
};

export default DiffText;
