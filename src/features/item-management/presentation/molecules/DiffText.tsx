import React, { useState, useEffect, useRef } from "react";
import { DiffSegment, diffCache } from "@/utils/diff";
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
  className = "",
  isFlipped = false,
}) => {
  const [segments, setSegments] = useState<DiffSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Create unique key for current inputs
  const inputKey = `${oldText}|||${newText}`;

  useEffect(() => {
    mountedRef.current = true; // Reset mounted status

    const computeDiff = async () => {
      console.log(`🔍 Computing diff for: ${inputKey.substring(0, 30)}...`);

      // L1 Cache check first
      const cachedResult = diffCache.get(oldText, newText);
      if (cachedResult) {
        console.log('🚀 L1 Cache HIT');
        if (mountedRef.current) {
          setSegments(cachedResult);
          setIsLoading(false);
        }
        return;
      }

      // Start loading
      if (mountedRef.current) {
        setError(null);
        setIsLoading(true);
      }

      try {
        // Server request dengan deduplication
        const segments = await diffCache.getOrCreatePendingRequest(
          oldText,
          newText,
          async () => {
            console.log('📡 Making server request...');
            const result = await analyzeDiff(oldText, newText);
            console.log(`✅ Server response: ${result.meta.processingTime}ms ${result.meta.fromCache ? '(cached)' : '(computed)'}`);
            return result.segments;
          }
        );

        console.log(`📦 Received ${segments?.length || 0} segments`);

        // Update state jika component masih mounted
        if (mountedRef.current) {
          console.log('✅ Updating UI state');
          setSegments(segments || []);
          diffCache.set(oldText, newText, segments || []);
        } else {
          console.log('⏭️ Component unmounted - skipping UI update');
          // Still cache the result for future use
          diffCache.set(oldText, newText, segments || []);
        }

      } catch (serverError) {
        console.error('❌ Server request failed:', serverError);
        if (mountedRef.current) {
          setError('Tidak dapat menerima hasil komputasi. Coba lagi nanti.');
          setSegments([]);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    computeDiff();

    // Cleanup: mark as unmounted
    return () => {
      console.log(`🧹 Cleanup: unmounting for ${inputKey.substring(0, 30)}...`);
      mountedRef.current = false;
    };
  }, [oldText, newText, inputKey]);

  // Error state
  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        <span className="inline-flex items-center gap-1">
          ⚠️ {error}
        </span>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <ComparisonSkeleton lines={1} />
      </div>
    );
  }

  // Helper function to get segment styling with flip support
  const getSegmentStyle = (type: 'added' | 'removed' | 'unchanged') => {
    if (type === 'unchanged') {
      return {
        className: "text-gray-800",
        style: {},
        title: ""
      };
    }
    
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

  // Normal diff display
  return (
    <span className={`font-mono text-sm ${className}`}>
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