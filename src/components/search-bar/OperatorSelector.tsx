import React, { useEffect, useRef, useState } from 'react';
import {
  LuCheck,
  LuX,
  LuSearch,
  LuChevronLeft,
  LuChevronRight,
} from 'react-icons/lu';
import { HiOutlineSparkles } from 'react-icons/hi2';
import fuzzysort from 'fuzzysort';

export interface FilterOperator {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface OperatorSelectorProps {
  operators: FilterOperator[];
  isOpen: boolean;
  onSelect: (operator: FilterOperator) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchTerm?: string;
}

type AnimationPhase =
  | 'hidden'
  | 'header'
  | 'footer'
  | 'content'
  | 'complete'
  | 'closing';

const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  operators,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = '',
}) => {
  const [filteredOperators, setFilteredOperators] =
    useState<FilterOperator[]>(operators);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [animationPhase, setAnimationPhase] =
    useState<AnimationPhase>('hidden');
  const modalRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Animation sequence effect
  useEffect(() => {
    if (isOpen && animationPhase === 'hidden') {
      setAnimationPhase('header');
      setTimeout(() => setAnimationPhase('footer'), 150);
      setTimeout(() => setAnimationPhase('content'), 300);
      setTimeout(() => setAnimationPhase('complete'), 650);
    } else if (!isOpen && animationPhase !== 'hidden') {
      setAnimationPhase('closing');
      setTimeout(() => setAnimationPhase('hidden'), 200);
    }
  }, [isOpen, animationPhase]);

  useEffect(() => {
    if (searchTerm) {
      const searchTargets = operators.map(op => ({
        operator: op,
        label: op.label,
        value: op.value,
        description: op.description || '',
      }));

      const labelResults = fuzzysort.go(searchTerm, searchTargets, {
        key: 'label',
        threshold: -1000,
      });

      const valueResults = fuzzysort.go(searchTerm, searchTargets, {
        key: 'value',
        threshold: -1000,
      });

      const descResults = fuzzysort.go(searchTerm, searchTargets, {
        key: 'description',
        threshold: -1000,
      });

      const combinedResults = new Map();

      labelResults.forEach(result => {
        combinedResults.set(result.obj.operator.value, {
          operator: result.obj.operator,
          score: result.score + 1000,
        });
      });

      valueResults.forEach(result => {
        if (!combinedResults.has(result.obj.operator.value)) {
          combinedResults.set(result.obj.operator.value, {
            operator: result.obj.operator,
            score: result.score + 500,
          });
        }
      });

      descResults.forEach(result => {
        if (!combinedResults.has(result.obj.operator.value)) {
          combinedResults.set(result.obj.operator.value, {
            operator: result.obj.operator,
            score: result.score,
          });
        }
      });

      const filtered = Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .map(item => item.operator);

      setFilteredOperators(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredOperators(operators);
      setSelectedIndex(0);
    }
  }, [searchTerm, operators]);

  // Simple keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredOperators.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev === 0 ? filteredOperators.length - 1 : prev - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOperators[selectedIndex]) {
            onSelect(filteredOperators[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredOperators, selectedIndex, onSelect, onClose]);

  // Simple scroll to selected item
  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (animationPhase === 'hidden') return null;

  return (
    <div
      ref={modalRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-80 flex flex-col"
      style={{
        top: position.top + 5,
        left: position.left,
        maxHeight: '320px',
      }}
    >
      {/* Header */}
      <div
        className={`flex-shrink-0 bg-white border-b border-gray-100 px-3 py-2 rounded-t-lg transition-opacity duration-200 ${
          animationPhase === 'closing' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <HiOutlineSparkles className="w-3 h-3" />
          <span>Pilih operator filter untuk kolom</span>
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex-1 overflow-y-auto min-h-0 transition-all duration-300 ease-out ${
          animationPhase === 'header' ||
          animationPhase === 'footer' ||
          animationPhase === 'closing'
            ? 'opacity-0 max-h-0'
            : 'opacity-100'
        }`}
        style={{
          transform:
            animationPhase === 'header' ||
            animationPhase === 'footer' ||
            animationPhase === 'closing'
              ? 'translateY(-10px)'
              : 'translateY(0px)',
        }}
      >
        {filteredOperators.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            Tidak ada operator yang ditemukan untuk "{searchTerm}"
          </div>
        ) : (
          <div className="py-1">
            {filteredOperators.map((operator, index) => (
              <div
                key={operator.value}
                ref={el => {
                  itemRefs.current[index] = el;
                }}
                className={`px-3 py-2 cursor-pointer flex items-start gap-3 mx-1 rounded-md transition-all duration-200 ease-out ${
                  index === selectedIndex
                    ? 'bg-purple-100'
                    : 'bg-transparent hover:bg-gray-50'
                }`}
                onClick={() => onSelect(operator)}
              >
                <div className="flex-shrink-0 mt-0.5">{operator.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        index === selectedIndex
                          ? 'text-purple-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {operator.label}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {operator.value}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {operator.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={`flex-shrink-0 bg-gray-50 border-t border-gray-100 px-3 py-2 rounded-b-lg transition-opacity duration-200 ${
          animationPhase === 'header' || animationPhase === 'closing'
            ? 'opacity-0'
            : 'opacity-100'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ navigasi • Enter pilih • Esc tutup</span>
          <span>{filteredOperators.length} operator</span>
        </div>
      </div>
    </div>
  );
};

export default OperatorSelector;

// Default operators
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_FILTER_OPERATORS: FilterOperator[] = [
  {
    value: 'contains',
    label: 'Contains',
    description: 'Kolom mengandung teks yang dicari',
    icon: <LuSearch className="w-3 h-3 text-green-500" />,
  },
  {
    value: 'notContains',
    label: 'Not Contains',
    description: 'Kolom tidak mengandung teks yang dicari',
    icon: <LuSearch className="w-3 h-3 text-red-500" />,
  },
  {
    value: 'equals',
    label: 'Equals',
    description: 'Kolom sama persis dengan teks yang dicari',
    icon: <LuCheck className="w-3 h-3 text-blue-500" />,
  },
  {
    value: 'notEqual',
    label: 'Not Equal',
    description: 'Kolom tidak sama dengan teks yang dicari',
    icon: <LuX className="w-3 h-3 text-orange-500" />,
  },
  {
    value: 'startsWith',
    label: 'Starts With',
    description: 'Kolom dimulai dengan teks yang dicari',
    icon: <LuChevronRight className="w-3 h-3 text-purple-500" />,
  },
  {
    value: 'endsWith',
    label: 'Ends With',
    description: 'Kolom diakhiri dengan teks yang dicari',
    icon: <LuChevronLeft className="w-3 h-3 text-indigo-500" />,
  },
];
