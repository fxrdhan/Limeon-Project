import type { MouseEvent } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { formatDateTime } from '@/lib/formatters';
import { getChangedFieldLabels } from './historyFieldLabels';
import type { HistoryItemCardProps } from './types';

const getSelectedBulletClass = ({
  isFlipped,
  itemId,
  selectedForCompare,
}: {
  isFlipped: boolean;
  itemId: string;
  selectedForCompare: HistoryItemCardProps['selectedForCompare'];
}) => {
  const selectionIndex = selectedForCompare.findIndex(
    selected => selected.id === itemId
  );
  if (selectionIndex < 0) {
    return 'border-2 border-slate-300 bg-white';
  }

  if (isFlipped) {
    return selectionIndex === 0
      ? 'border-2 border-purple-300 bg-purple-300'
      : 'border-2 border-blue-300 bg-blue-300';
  }

  return selectionIndex === 0
    ? 'border-2 border-blue-300 bg-blue-300'
    : 'border-2 border-purple-300 bg-purple-300';
};

export function HistoryItemCard({
  item,
  index,
  isSelected,
  isExpanded,
  isFirst,
  isLast,
  allowMultiSelect,
  selectedForCompare,
  isFlipped,
  latestVersion,
  showRestoreButton,
  bgColor,
  skipEntranceAnimation,
  showExpandedRestoreActions,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onRestore,
}: HistoryItemCardProps) {
  const isPresent = useIsPresent();

  const handleRestore = (event: MouseEvent, version: number) => {
    event.stopPropagation();
    if (onRestore) {
      onRestore(version);
    }
  };
  const canRestore =
    showRestoreButton &&
    item.version_number < latestVersion &&
    Boolean(onRestore);
  const hasExpandedContent =
    isExpanded &&
    (Boolean(item.changed_fields) ||
      (showExpandedRestoreActions && canRestore && isSelected));

  return (
    <motion.div
      layout="position"
      initial={
        skipEntranceAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }
      }
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30,
          delay: skipEntranceAnimation ? 0 : index * 0.08,
        },
      }}
      transition={{
        layout: {
          duration: 0.26,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      exit={{
        opacity: 0,
        y: -10,
        transition: {
          duration: 0.2,
        },
      }}
      style={{
        position: isPresent ? 'static' : 'absolute',
        willChange: 'transform',
        backfaceVisibility: 'hidden' as const,
      }}
      className={`relative ${isFirst ? 'pt-2' : ''} ${isLast ? 'pb-2' : ''}`}
      data-version-number={item.version_number}
    >
      <span
        className={`absolute left-0 top-5 w-3 h-3 rounded-full transition-colors duration-200 block ${
          isSelected
            ? allowMultiSelect
              ? getSelectedBulletClass({
                  isFlipped,
                  itemId: item.id,
                  selectedForCompare,
                })
              : 'border-2 border-blue-300 bg-blue-300'
            : 'border-2 border-slate-300 bg-white'
        }`}
      />

      <div
        className={`ml-6 py-3 px-4 cursor-pointer transition-all duration-200 rounded-xl ${bgColor} ${
          isExpanded ? 'shadow-md' : ''
        } border border-slate-200 hover:border-slate-300`}
        onMouseEnter={() => onMouseEnter(item.id)}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(item)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick(item);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                item.action_type === 'INSERT'
                  ? 'bg-green-100 text-green-700'
                  : item.action_type === 'UPDATE'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {item.action_type}
            </span>
            <span className="text-slate-500 text-xs">
              {formatDateTime(item.changed_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
              v{item.version_number}
            </span>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: hasExpandedContent ? 'auto' : 0,
            opacity: hasExpandedContent ? 1 : 0,
            marginTop: hasExpandedContent ? 12 : 0,
          }}
          transition={{
            duration: 0.24,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="overflow-hidden"
        >
          {item.changed_fields && (
            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-500">Mengubah:</span>{' '}
              {getChangedFieldLabels(item.changed_fields)}
            </div>
          )}
          {showExpandedRestoreActions && canRestore && isSelected && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                onClick={event => {
                  event.stopPropagation();
                  onClick(item);
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
                onClick={event => handleRestore(event, item.version_number)}
              >
                Rollback
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
