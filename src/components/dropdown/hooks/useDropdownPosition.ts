import {
  useState,
  useCallback,
  useEffect,
  RefObject,
  CSSProperties,
} from 'react';
import { DROPDOWN_CONSTANTS, DropDirection } from '../constants';
import type {
  DropdownPortalWidth,
  DropdownPosition,
  DropdownAlign,
  DropdownOption,
} from '@/types';

export const useDropdownPosition = (
  isOpen: boolean,
  buttonRef: RefObject<HTMLButtonElement | null>,
  dropdownMenuRef: RefObject<HTMLDivElement | null>,
  portalWidth: DropdownPortalWidth = 'auto',
  position: DropdownPosition = 'auto',
  align: DropdownAlign = 'right',
  options: DropdownOption[] = []
) => {
  const [dropDirection, setDropDirection] = useState<DropDirection>('down');
  const [initialDropDirection, setInitialDropDirection] =
    useState<DropDirection | null>(null);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({});
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [isLeftPositioning, setIsLeftPositioning] = useState(false);

  // Calculate content-based width
  const calculateContentWidth = useCallback(() => {
    if (!options.length) return 200; // fallback width

    // Create temporary element to measure text width
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 200;

    // Use typical dropdown font settings
    context.font =
      '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let maxWidth = 0;
    options.forEach(option => {
      const textWidth = context.measureText(option.name).width;
      maxWidth = Math.max(maxWidth, textWidth);
    });

    // Add padding for checkboxes, icons, and spacing (roughly 80px)
    const contentWidth = maxWidth + 80;

    // Ensure minimum and maximum width
    return Math.max(120, Math.min(contentWidth, 400));
  }, [options]);

  const calculateDropdownPosition = useCallback(() => {
    if (!isOpen) {
      setIsPositionReady(false);
      return;
    }

    if (!dropdownMenuRef.current || !buttonRef.current) {
      // Wait for refs to be available
      if (isOpen && !dropdownMenuRef.current) {
        requestAnimationFrame(calculateDropdownPosition);
      }
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownActualHeight = dropdownMenuRef.current.scrollHeight;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const margin = DROPDOWN_CONSTANTS.DROPDOWN_MARGIN;
    const spaceBelow = viewportHeight - buttonRect.bottom - margin;
    const spaceAbove = buttonRect.top - margin;
    const spaceLeft = buttonRect.left - margin;

    // Determine drop direction based on position prop
    let targetDirection: DropDirection;
    let currentIsLeftPositioning = false;

    if (position === 'left') {
      // Left positioning: dropdown appears to the left of button
      currentIsLeftPositioning = true;
      // For left positioning, we still need to decide up/down within the left space
      const shouldDropUp =
        (spaceBelow < dropdownActualHeight &&
          spaceAbove > dropdownActualHeight) ||
        (spaceBelow < dropdownActualHeight && spaceAbove > spaceBelow);
      targetDirection = shouldDropUp ? 'up' : 'down';
    } else if (position === 'top') {
      targetDirection = 'up';
    } else if (position === 'bottom') {
      targetDirection = 'down';
    } else {
      // Auto positioning logic
      const shouldDropUp =
        (spaceBelow < dropdownActualHeight &&
          spaceAbove > dropdownActualHeight) ||
        (spaceBelow < dropdownActualHeight && spaceAbove > spaceBelow);
      targetDirection = shouldDropUp ? 'up' : 'down';
    }

    // Set initial direction only once when dropdown first opens
    if (initialDropDirection === null) {
      setDropDirection(targetDirection);
      setInitialDropDirection(targetDirection);
    } else {
      setDropDirection(initialDropDirection);
    }

    // Calculate dropdown width for positioning
    let dropdownWidth = buttonRect.width; // default to button width
    if (portalWidth === 'content') {
      dropdownWidth = calculateContentWidth();
    } else if (portalWidth !== 'auto') {
      dropdownWidth =
        typeof portalWidth === 'number'
          ? portalWidth
          : parseInt(portalWidth as string, 10) || buttonRect.width;
    }

    // Calculate left position based on positioning mode
    let leftPosition: number;

    if (currentIsLeftPositioning) {
      // Left positioning: dropdown appears to the left of button
      leftPosition =
        buttonRect.left - dropdownWidth - DROPDOWN_CONSTANTS.DROPDOWN_SPACING;

      // Check if there's enough space on the left
      const minRequiredSpace =
        dropdownWidth + DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
      if (spaceLeft < minRequiredSpace) {
        // Fallback to regular positioning if no space on left
        currentIsLeftPositioning = false;
        if (align === 'left') {
          leftPosition = buttonRect.left;
        } else {
          leftPosition = buttonRect.right - dropdownWidth;
        }
      }
    } else {
      // Regular positioning: align the dropdown based on align prop
      if (align === 'left') {
        // Left-align: dropdown starts at button's left edge
        leftPosition = buttonRect.left;
      } else {
        // Right-align: dropdown ends at button's right edge
        leftPosition = buttonRect.right - dropdownWidth;
      }
    }

    // Keep dropdown within viewport bounds (only if not in left positioning mode)
    if (!currentIsLeftPositioning) {
      if (
        leftPosition + dropdownWidth >
        viewportWidth - DROPDOWN_CONSTANTS.VIEWPORT_MARGIN
      ) {
        leftPosition =
          viewportWidth - dropdownWidth - DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
      }
    }

    if (leftPosition < DROPDOWN_CONSTANTS.VIEWPORT_MARGIN) {
      leftPosition = DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
    }

    const finalDirection = initialDropDirection || targetDirection;
    const isDropUp = finalDirection === 'up';

    let topPosition: number;

    if (currentIsLeftPositioning) {
      // For left positioning, align dropdown top with button top
      topPosition = buttonRect.top + window.scrollY;

      // Ensure dropdown doesn't go below viewport
      const maxTop =
        viewportHeight -
        dropdownActualHeight -
        DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
      if (topPosition + dropdownActualHeight > maxTop + window.scrollY) {
        topPosition = maxTop + window.scrollY;
      }

      // Ensure dropdown doesn't go above viewport
      const minTop = DROPDOWN_CONSTANTS.VIEWPORT_MARGIN + window.scrollY;
      if (topPosition < minTop) {
        topPosition = minTop;
      }
    } else {
      // Regular vertical positioning
      if (isDropUp) {
        topPosition =
          buttonRect.top +
          window.scrollY -
          dropdownActualHeight -
          DROPDOWN_CONSTANTS.DROPDOWN_SPACING -
          3; // Extra offset untuk portal yang muncul ke atas
      } else {
        topPosition =
          buttonRect.bottom +
          window.scrollY +
          DROPDOWN_CONSTANTS.DROPDOWN_SPACING;
      }
    }

    const portalStyleBase: CSSProperties = {
      position: currentIsLeftPositioning ? 'absolute' : 'fixed',
      left: `${leftPosition}px`,
      zIndex: DROPDOWN_CONSTANTS.PORTAL_Z_INDEX,
      top: `${topPosition}px`,
    };

    // Set width based on portalWidth value
    if (portalWidth === 'auto') {
      // Auto: use button width
      portalStyleBase.width = `${buttonRect.width}px`;
    } else if (portalWidth === 'content') {
      // Content: calculate width based on option content
      const contentWidth = calculateContentWidth();
      portalStyleBase.width = `${contentWidth}px`;
    } else {
      // Custom width: use provided value
      portalStyleBase.width =
        typeof portalWidth === 'number' ? `${portalWidth}px` : portalWidth;
    }

    setPortalStyle(portalStyleBase);
    setIsLeftPositioning(currentIsLeftPositioning);
    setIsPositionReady(true);
  }, [
    isOpen,
    initialDropDirection,
    buttonRef,
    dropdownMenuRef,
    portalWidth,
    position,
    align,
    calculateContentWidth,
  ]);

  const resetPosition = useCallback(() => {
    setInitialDropDirection(null);
    setIsPositionReady(false);
  }, []);

  // Auto calculate position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Calculate position first, then set ready state
      setIsPositionReady(false);
      calculateDropdownPosition();
    } else {
      setIsPositionReady(false);
    }
  }, [isOpen, calculateDropdownPosition]);

  return {
    dropDirection,
    portalStyle,
    isPositionReady,
    calculateDropdownPosition,
    resetPosition,
    isLeftPositioning,
  };
};
