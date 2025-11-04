import React, { useMemo } from 'react';
import { diffChars, convertChangesToSegments } from '@/utils/jsdiff';

interface LocalDiffTextProps {
  oldText: string;
  newText: string;
  className?: string;
  isFlipped?: boolean;
}

const DiffText: React.FC<LocalDiffTextProps> = ({
  oldText,
  newText,
  className = '',
  isFlipped = false,
}) => {
  // Compute character-level diff directly
  const segments = useMemo(() => {
    try {
      const changes = diffChars(oldText, newText);
      return convertChangesToSegments(changes);
    } catch (error) {
      console.error('❌ Character diff computation failed:', error);
      return [];
    }
  }, [oldText, newText]);

  // Return early if no segments
  if (!segments.length) {
    return <span className={`${className}`}>{newText}</span>;
  }

  // Helper function to get segment styling with flip support
  const getSegmentStyle = (type: 'added' | 'removed' | 'unchanged') => {
    if (type === 'unchanged') {
      return {
        className: 'text-gray-800',
        style: {},
        title: '',
      };
    }

    const isAddedType = type === 'added';
    const shouldShowGreen = isFlipped ? !isAddedType : isAddedType;

    if (shouldShowGreen) {
      return {
        className: 'bg-green-400 text-gray-900 py-0.5 font-medium',
        style: { backgroundColor: '#4ade80' },
        title: isFlipped ? 'Dihapus' : 'Ditambahkan',
      };
    } else {
      return {
        className: 'bg-red-400 text-gray-900 py-0.5 font-medium',
        style: { backgroundColor: '#f87171' },
        title: isFlipped ? 'Ditambahkan' : 'Dihapus',
      };
    }
  };

  // Normal diff display
  return (
    <span className={`text-sm ${className}`}>
      {segments.map((segment, index) => {
        const segmentStyle = getSegmentStyle(
          segment.type as 'added' | 'removed' | 'unchanged'
        );

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
