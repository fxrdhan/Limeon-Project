import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canUseHoverPointer } from './styles';
import type {
  SlidingSelectorExpandDirection,
  SlidingSelectorOption,
} from './types';

interface UseSlidingSelectorInteractionProps<T> {
  activeKey: string;
  autoCollapseDelay: number;
  collapseSignal?: number;
  collapsible: boolean;
  defaultExpanded: boolean;
  disabled: boolean;
  expandDirection: SlidingSelectorExpandDirection;
  expandOnHover: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSelectionChange: (key: string, value: T, event?: React.MouseEvent) => void;
  options: SlidingSelectorOption<T>[];
}

export const useSlidingSelectorInteraction = <T>({
  activeKey,
  autoCollapseDelay,
  collapseSignal,
  collapsible,
  defaultExpanded,
  disabled,
  expandDirection,
  expandOnHover,
  onExpandedChange,
  onSelectionChange,
  options,
}: UseSlidingSelectorInteractionProps<T>) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVerticalActiveFillVisible, setIsVerticalActiveFillVisible] =
    useState(defaultExpanded && expandDirection === 'vertical');
  const mouseLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const hoverExpandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const previousCollapseSignalRef = useRef(collapseSignal);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const supportsHoverPointer = canUseHoverPointer();

  const clearHoverExpandTimeout = useCallback(() => {
    if (hoverExpandTimeoutRef.current) {
      clearTimeout(hoverExpandTimeoutRef.current);
      hoverExpandTimeoutRef.current = null;
    }
  }, []);

  const clearMouseLeaveTimeout = useCallback(() => {
    if (mouseLeaveTimeoutRef.current) {
      clearTimeout(mouseLeaveTimeoutRef.current);
      mouseLeaveTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  useEffect(() => {
    if (!collapsible || collapseSignal === undefined) return;
    if (previousCollapseSignalRef.current === collapseSignal) return;

    previousCollapseSignalRef.current = collapseSignal;
    clearHoverExpandTimeout();
    clearMouseLeaveTimeout();
    setIsExpanded(false);
    setIsMouseOver(false);
    setHoveredIndex(null);
    setFocusedIndex(-1);
    buttonRefs.current.forEach(button => button?.blur());
  }, [
    clearHoverExpandTimeout,
    clearMouseLeaveTimeout,
    collapseSignal,
    collapsible,
  ]);

  useEffect(() => {
    if (!disabled) return;

    clearHoverExpandTimeout();
    clearMouseLeaveTimeout();
    setIsMouseOver(false);
    setHoveredIndex(null);
    setFocusedIndex(-1);
  }, [clearHoverExpandTimeout, clearMouseLeaveTimeout, disabled]);

  useEffect(() => {
    if (expandDirection !== 'vertical') {
      setIsVerticalActiveFillVisible(false);
      return;
    }

    if (isExpanded) {
      setIsVerticalActiveFillVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVerticalActiveFillVisible(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [expandDirection, isExpanded]);

  useEffect(() => {
    if (!collapsible || !isExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      ) {
        return;
      }

      clearHoverExpandTimeout();
      setIsExpanded(false);
      setIsMouseOver(false);
      setHoveredIndex(null);
      setFocusedIndex(-1);
      buttonRefs.current.forEach(button => button?.blur());
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [clearHoverExpandTimeout, collapsible, isExpanded]);

  useEffect(() => {
    if (!collapsible || !expandOnHover) return;
    if (!supportsHoverPointer) return;

    const hasFocus = buttonRefs.current.some(
      button => button && document.activeElement === button
    );

    if (!isMouseOver && isExpanded && !hasFocus) {
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
        setFocusedIndex(-1);
        mouseLeaveTimeoutRef.current = null;
      }, autoCollapseDelay);
    } else if (isMouseOver || hasFocus) {
      clearMouseLeaveTimeout();
      clearHoverExpandTimeout();
      hoverExpandTimeoutRef.current = setTimeout(() => {
        hoverExpandTimeoutRef.current = null;
        setIsExpanded(true);
      }, 0);
    }

    return () => {
      clearMouseLeaveTimeout();
      clearHoverExpandTimeout();
    };
  }, [
    clearHoverExpandTimeout,
    clearMouseLeaveTimeout,
    isMouseOver,
    isExpanded,
    collapsible,
    expandOnHover,
    supportsHoverPointer,
    autoCollapseDelay,
    focusedIndex,
  ]);

  useEffect(() => {
    if (isExpanded && isMouseOver && expandOnHover && collapsible) {
      const timer = setTimeout(() => {
        const activeIndex = options.findIndex(
          option => option.key === activeKey
        );
        if (activeIndex >= 0 && buttonRefs.current[activeIndex]) {
          buttonRefs.current[activeIndex]?.focus();
          setFocusedIndex(activeIndex);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isMouseOver, expandOnHover, collapsible, options, activeKey]);

  useEffect(() => {
    if (!collapsible) return;
    if (!isExpanded) return;

    if (!expandOnHover) {
      const activeIndex = options.findIndex(option => option.key === activeKey);
      if (activeIndex >= 0) {
        const timer = setTimeout(() => {
          buttonRefs.current[activeIndex]?.focus();
          setFocusedIndex(activeIndex);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [activeKey, collapsible, expandOnHover, isExpanded, options]);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;

    if (expandOnHover && supportsHoverPointer) {
      setIsMouseOver(true);
    }
  }, [disabled, expandOnHover, supportsHoverPointer]);

  const handleMouseLeave = useCallback(() => {
    if (!supportsHoverPointer) return;

    setHoveredIndex(null);

    if (expandOnHover) {
      setIsMouseOver(false);
      buttonRefs.current.forEach(button => {
        if (button && document.activeElement === button) {
          button.blur();
        }
      });
      setFocusedIndex(-1);
    }
  }, [expandOnHover, supportsHoverPointer]);

  const toggleExpanded = useCallback(() => {
    if (disabled) return;

    if (collapsible) {
      clearHoverExpandTimeout();
      setIsExpanded(previousValue => !previousValue);
    }
  }, [clearHoverExpandTimeout, collapsible, disabled]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled || !isExpanded) return;

      if (event.repeat) {
        return;
      }

      const enabledOptions = options.filter(option => !option.disabled);
      const currentIndex =
        focusedIndex >= 0
          ? focusedIndex
          : enabledOptions.findIndex(option => option.key === activeKey);

      switch (event.key) {
        case 'Tab': {
          event.preventDefault();
          if (event.shiftKey) {
            const prevIndex =
              currentIndex > 0 ? currentIndex - 1 : enabledOptions.length - 1;
            const prevOption = enabledOptions[prevIndex];
            setFocusedIndex(prevIndex);
            buttonRefs.current[prevIndex]?.focus();
            onSelectionChange(prevOption.key, prevOption.value);
          } else {
            const nextIndex =
              currentIndex < enabledOptions.length - 1 ? currentIndex + 1 : 0;
            const nextOption = enabledOptions[nextIndex];
            setFocusedIndex(nextIndex);
            buttonRefs.current[nextIndex]?.focus();
            onSelectionChange(nextOption.key, nextOption.value);
          }
          break;
        }

        case 'Escape':
          event.preventDefault();
          if (collapsible) {
            clearHoverExpandTimeout();
            setIsExpanded(false);
            setFocusedIndex(-1);
          }
          break;
      }
    },
    [
      disabled,
      isExpanded,
      options,
      focusedIndex,
      activeKey,
      collapsible,
      clearHoverExpandTimeout,
      onSelectionChange,
    ]
  );

  const handleOptionClick = useCallback(
    (option: SlidingSelectorOption<T>, event: React.MouseEvent) => {
      if (disabled || option.disabled) return;

      (event.currentTarget as HTMLButtonElement).blur();
      setFocusedIndex(-1);
      setHoveredIndex(null);
      onSelectionChange(option.key, option.value, event);
    },
    [disabled, onSelectionChange]
  );

  useEffect(() => () => clearHoverExpandTimeout(), [clearHoverExpandTimeout]);

  return {
    buttonRefs,
    handleKeyDown,
    handleMouseEnter,
    handleMouseLeave,
    handleOptionClick,
    hoveredIndex,
    isExpanded,
    isVerticalActiveFillVisible,
    rootRef,
    setHoveredIndex,
    supportsHoverPointer,
    toggleExpanded,
  };
};
