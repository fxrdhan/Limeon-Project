import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { BaseSelectorProps } from '../../types';
import { BaseSelectorContent } from './base-selector/BaseSelectorContent';

function BaseSelector<T>({
  items,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm,
  config,
  defaultSelectedIndex,
  onHighlightChange,
  contentKey,
  outsideClickIgnoreRef,
  outsideClickIgnoreRefs,
  isVisuallyReady = true,
}: BaseSelectorProps<T>) {
  const activeContentKey = contentKey ?? config.headerText;
  const isPositionReady = position.isReady ?? true;
  const currentModalPosition = useMemo(
    () => ({
      x: position.left,
      y: position.top + 5,
    }),
    [position.left, position.top]
  );
  const [lastReadyModalPosition, setLastReadyModalPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const modalPosition = isPositionReady
    ? currentModalPosition
    : lastReadyModalPosition;
  const ignoredOutsidePressRefs = useMemo(
    () => [
      ...(outsideClickIgnoreRef ? [outsideClickIgnoreRef] : []),
      ...(outsideClickIgnoreRefs ?? []),
    ],
    [outsideClickIgnoreRef, outsideClickIgnoreRefs]
  );

  useEffect(() => {
    if (!isOpen) onHighlightChange?.(null);
  }, [isOpen, onHighlightChange]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setLastReadyModalPosition(null);
      return;
    }

    if (!isPositionReady) return;

    setLastReadyModalPosition(previous => {
      if (
        previous &&
        Math.abs(previous.x - currentModalPosition.x) < 0.5 &&
        Math.abs(previous.y - currentModalPosition.y) < 0.5
      ) {
        return previous;
      }

      return currentModalPosition;
    });
  }, [currentModalPosition, isOpen, isPositionReady]);

  if (!isOpen || modalPosition === null) return null;

  return (
    <BaseSelectorContent<T>
      activeContentKey={activeContentKey}
      items={items}
      isOpen={isOpen}
      onSelect={onSelect}
      onClose={onClose}
      position={position}
      searchTerm={searchTerm}
      config={config}
      defaultSelectedIndex={defaultSelectedIndex}
      onHighlightChange={onHighlightChange}
      contentKey={contentKey}
      outsideClickIgnoreRef={outsideClickIgnoreRef}
      outsideClickIgnoreRefs={outsideClickIgnoreRefs}
      ignoredOutsidePressRefs={ignoredOutsidePressRefs}
      isVisuallyReady={isVisuallyReady}
      modalPosition={modalPosition}
    />
  );
}

export default BaseSelector;
