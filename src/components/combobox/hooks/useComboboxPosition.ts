import {
  useState,
  useCallback,
  useEffect,
  useRef,
  RefObject,
  CSSProperties,
} from 'react';
import { COMBOBOX_CONSTANTS, DropDirection } from '../constants';
import type {
  ComboboxPortalWidth,
  ComboboxPosition,
  ComboboxAlign,
  ComboboxOption,
} from '@/types';

const getComboboxVisibleHeight = (element: HTMLDivElement) =>
  element.offsetHeight || element.clientHeight || element.scrollHeight;

export const useComboboxPosition = (
  isOpen: boolean,
  buttonRef: RefObject<HTMLButtonElement | null>,
  dropdownMenuRef: RefObject<HTMLDivElement | null>,
  portalWidth: ComboboxPortalWidth = 'auto',
  position: ComboboxPosition = 'auto',
  align: ComboboxAlign = 'right',
  options: ComboboxOption[] = []
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

    // Use font from Tailwind @theme (defined in App.css)
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

  const calculateComboboxPosition = useCallback(() => {
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
    const dropdownActualHeight = getComboboxVisibleHeight(
      dropdownMenuRef.current
    );
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const margin = COMBOBOX_CONSTANTS.COMBOBOX_MARGIN;
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
        buttonRect.left - dropdownWidth - COMBOBOX_CONSTANTS.COMBOBOX_SPACING;

      const minRequiredSpace =
        dropdownWidth + COMBOBOX_CONSTANTS.VIEWPORT_MARGIN;
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
        viewportWidth - COMBOBOX_CONSTANTS.VIEWPORT_MARGIN
      ) {
        leftPosition =
          viewportWidth - dropdownWidth - COMBOBOX_CONSTANTS.VIEWPORT_MARGIN;
      }
    }

    if (leftPosition < COMBOBOX_CONSTANTS.VIEWPORT_MARGIN) {
      leftPosition = COMBOBOX_CONSTANTS.VIEWPORT_MARGIN;
    }

    const finalDirection = initialDropDirection || targetDirection;
    const isDropUp = finalDirection === 'up';

    let topPosition: number;

    if (currentIsLeftPositioning) {
      topPosition = buttonRect.top + window.scrollY;

      const maxTop =
        viewportHeight -
        dropdownActualHeight -
        COMBOBOX_CONSTANTS.VIEWPORT_MARGIN;
      if (topPosition + dropdownActualHeight > maxTop + window.scrollY) {
        topPosition = maxTop + window.scrollY;
      }

      const minTop = COMBOBOX_CONSTANTS.VIEWPORT_MARGIN + window.scrollY;
      if (topPosition < minTop) {
        topPosition = minTop;
      }
    } else {
      if (isDropUp) {
        topPosition =
          buttonRect.top +
          window.scrollY -
          dropdownActualHeight -
          COMBOBOX_CONSTANTS.COMBOBOX_SPACING -
          3;
      } else {
        topPosition =
          buttonRect.bottom +
          window.scrollY +
          COMBOBOX_CONSTANTS.COMBOBOX_SPACING;
      }
    }

    const portalStyleBase: CSSProperties = {
      position: currentIsLeftPositioning ? 'absolute' : 'fixed',
      left: `${leftPosition}px`,
      zIndex: COMBOBOX_CONSTANTS.PORTAL_Z_INDEX,
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
    calculatePositionRef.current = calculateComboboxPosition;
  }, [calculateComboboxPosition]);

  const resetPosition = useCallback(() => {
    setInitialDropDirection(null);
    setIsPositionReady(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsPositionReady(false);
        calculateComboboxPosition();
      });
    }
  }, [isOpen, calculateComboboxPosition]);

  return {
    dropDirection,
    portalStyle,
    isPositionReady,
    calculateComboboxPosition,
    resetPosition,
    isLeftPositioning,
  };
};
