import React, { useState, useEffect } from "react";
import { createCharacterDiff, createWordDiff, createSmartDiff, DiffSegment } from "@/utils/diff";
import { analyzeDiff } from "@/services/api/diff.service";

interface LocalDiffTextProps {
  oldText: string;
  newText: string;
  mode?: "character" | "word" | "smart";
  className?: string;
}

const DiffText: React.FC<LocalDiffTextProps> = ({
  oldText,
  newText,
  mode = "smart",
  className = "",
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
      <span className={`font-mono text-sm ${className}`}>
        <span className="text-gray-500 animate-pulse">Computing differences...</span>
      </span>
    );
  }

  // Error state (still show the diff with warning)
  const showError = error && mode === "smart";

  return (
    <span className={`font-mono text-sm ${className}`}>
      {showError && (
        <span className="text-xs text-amber-600 block mb-1" title={error || ''}>
          ⚠️ Fallback mode
        </span>
      )}
      {segments.map((segment, index) => {
        switch (segment.type) {
          case "added":
            return (
              <span
                key={index}
                className="bg-green-400 text-gray-900 py-0.5 font-medium"
                title="Ditambahkan"
                style={{ backgroundColor: "#4ade80" }}
              >
                {segment.text}
              </span>
            );
          case "removed":
            return (
              <span
                key={index}
                className="bg-red-400 text-gray-900 py-0.5 font-medium"
                title="Dihapus"
                style={{ backgroundColor: "#f87171" }}
              >
                {segment.text}
              </span>
            );
          case "unchanged":
            return (
              <span key={index} className="text-gray-800">
                {segment.text}
              </span>
            );
          default:
            return null;
        }
      })}
    </span>
  );
};

export default DiffText;
