import { useState, useCallback, RefObject, CSSProperties } from 'react';
import { DROPDOWN_CONSTANTS, DropDirection } from '../constants';
import { getContextualBoxShadow } from '../utils/dropdownUtils';
import type { DropdownPortalWidth } from '@/types';

export const useDropdownPosition = (
  isOpen: boolean,
  buttonRef: RefObject<HTMLButtonElement | null>,
  dropdownMenuRef: RefObject<HTMLDivElement | null>,
  portalWidth: DropdownPortalWidth = 'auto'
) => {
  const [dropDirection, setDropDirection] = useState<DropDirection>('down');
  const [initialDropDirection, setInitialDropDirection] =
    useState<DropDirection | null>(null);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({});

  const calculateDropdownPosition = useCallback(() => {
    if (!isOpen || !dropdownMenuRef.current || !buttonRef.current) {
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

    const shouldDropUp =
      (spaceBelow < dropdownActualHeight &&
        spaceAbove > dropdownActualHeight) ||
      (spaceBelow < dropdownActualHeight && spaceAbove > spaceBelow);

    // Set initial direction only once when dropdown first opens
    if (initialDropDirection === null) {
      const direction = shouldDropUp ? 'up' : 'down';
      setDropDirection(direction);
      setInitialDropDirection(direction);
    } else {
      setDropDirection(initialDropDirection);
    }

    let leftPosition = buttonRect.left;
    if (
      leftPosition + buttonRect.width >
      viewportWidth - DROPDOWN_CONSTANTS.VIEWPORT_MARGIN
    ) {
      leftPosition =
        viewportWidth - buttonRect.width - DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
    }
    if (leftPosition < DROPDOWN_CONSTANTS.VIEWPORT_MARGIN) {
      leftPosition = DROPDOWN_CONSTANTS.VIEWPORT_MARGIN;
    }

    const finalDirection =
      initialDropDirection || (shouldDropUp ? 'up' : 'down');
    const isDropUp = finalDirection === 'up';

    let topPosition: number;
    if (isDropUp) {
      topPosition =
        buttonRect.top +
        window.scrollY -
        dropdownActualHeight -
        DROPDOWN_CONSTANTS.DROPDOWN_SPACING;
    } else {
      topPosition =
        buttonRect.bottom +
        window.scrollY +
        DROPDOWN_CONSTANTS.DROPDOWN_SPACING;
    }

    const portalStyleBase: CSSProperties = {
      position: 'fixed',
      left: `${leftPosition}px`,
      zIndex: 1050,
      top: `${topPosition}px`,
      boxShadow: getContextualBoxShadow(finalDirection),
    };

    // Set width based on portalWidth value
    if (portalWidth === 'auto') {
      // Auto: use button width
      portalStyleBase.width = `${buttonRect.width}px`;
    } else if (portalWidth !== 'auto') {
      // Custom width: use provided value
      portalStyleBase.width = typeof portalWidth === 'number' ? `${portalWidth}px` : portalWidth;
    }

    setPortalStyle(portalStyleBase);
  }, [isOpen, initialDropDirection, buttonRef, dropdownMenuRef, portalWidth]);

  const resetPosition = useCallback(() => {
    setInitialDropDirection(null);
  }, []);

  return {
    dropDirection,
    portalStyle,
    calculateDropdownPosition,
    resetPosition,
  };
};
