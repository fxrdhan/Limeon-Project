import {
  useState,
  useCallback,
  useEffect,
  useRef,
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
  const calculatePositionRef = useRef<(() => void) | null>(null);

  const calculateContentWidth = useCallback(() => {
    if (!options.length) return 200; // fallback width

    // Create temporary element to measure text width
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 200;

    // Use font from Tailwind @theme (defined in App.scss)
    const fontFamily = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-sans')
      .trim();
    const fontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-base')
      .trim();
    context.font = `500 ${fontSize} ${fontFamily}`;

    let maxWidth = 0;
    options.forEach(option => {
      const textWidth = context.measureText(option.name).width;
      maxWidth = Math.max(maxWidth, textWidth);
    });

    const contentWidth = maxWidth + 80;
    return Math.max(120, Math.min(contentWidth, 400));
  }, [options]);

  const calculateDropdownPosition = useCallback(() => {
    if (!isOpen) {
      return;
    }

    if (!dropdownMenuRef.current || !buttonRef.current) {
      if (isOpen && !dropdownMenuRef.current) {
        requestAnimationFrame(() => calculatePositionRef.current?.());
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

    let targetDirection: DropDirection;
    let currentIsLeftPositioning = false;

    if (position === 'left') {
      currentIsLeftPositioning = true;
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
      const shouldDropUp =
        (spaceBelow < dropdownActualHeight &&
          spaceAbove > dropdownActualHeight) ||
        (spaceBelow < dropdownActualHeight && spaceAbove > spaceBelow);
      targetDirection = shouldDropUp ? 'up' : 'down';
    }

    if (initialDropDirection === null) {
      setDropDirection(targetDirection);
      setInitialDropDirection(targetDirection);
    } else {
      setDropDirection(initialDropDirection);
    }

    let dropdownWidth = buttonRect.width;
    if (portalWidth === 'content') {
      dropdownWidth = calculateContentWidth();
    } else if (portalWidth !== 'auto') {
      dropdownWidth =
        typeof portalWidth === 'number'
          ? portalWidth
          : parseInt(portalWidth as string, 10) || buttonRect.width;
    }

    let leftPosition: number;

    if (currentIsLeftPositioning) {
      leftPosition =
        buttonRect.left - dropdownWidth - DROPDOWN_CONSTANTS.DROPDOWN_SPACING;

      const minRequiredSpace =
        dropdownWidth + DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
      if (spaceLeft < minRequiredSpace) {
        currentIsLeftPositioning = false;
        if (align === 'left') {
          leftPosition = buttonRect.left;
        } else {
          leftPosition = buttonRect.right - dropdownWidth;
        }
      }
    } else {
      if (align === 'left') {
        leftPosition = buttonRect.left;
      } else {
        leftPosition = buttonRect.right - dropdownWidth;
      }
    }

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
      topPosition = buttonRect.top + window.scrollY;

      const maxTop =
        viewportHeight -
        dropdownActualHeight -
        DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
      if (topPosition + dropdownActualHeight > maxTop + window.scrollY) {
        topPosition = maxTop + window.scrollY;
      }

      const minTop = DROPDOWN_CONSTANTS.VIEWPORT_MARGIN + window.scrollY;
      if (topPosition < minTop) {
        topPosition = minTop;
      }
    } else {
      if (isDropUp) {
        topPosition =
          buttonRect.top +
          window.scrollY -
          dropdownActualHeight -
          DROPDOWN_CONSTANTS.DROPDOWN_SPACING -
          3;
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

    if (portalWidth === 'auto') {
      portalStyleBase.width = `${buttonRect.width}px`;
    } else if (portalWidth === 'content') {
      const contentWidth = calculateContentWidth();
      portalStyleBase.width = `${contentWidth}px`;
    } else {
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

  useEffect(() => {
    calculatePositionRef.current = calculateDropdownPosition;
  }, [calculateDropdownPosition]);

  const resetPosition = useCallback(() => {
    setInitialDropDirection(null);
    setIsPositionReady(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsPositionReady(false);
      requestAnimationFrame(() => {
        calculateDropdownPosition();
      });
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
