import {
  useState,
  useCallback,
  useEffect,
  RefObject,
  CSSProperties,
} from 'react';
import { DROPDOWN_CONSTANTS, DropDirection } from '../constants';
import type { DropdownPortalWidth, DropdownPosition } from '@/types';

export const useDropdownPosition = (
  isOpen: boolean,
  buttonRef: RefObject<HTMLButtonElement | null>,
  dropdownMenuRef: RefObject<HTMLDivElement | null>,
  portalWidth: DropdownPortalWidth = 'auto',
  position: DropdownPosition = 'auto'
) => {
  const [dropDirection, setDropDirection] = useState<DropDirection>('down');
  const [initialDropDirection, setInitialDropDirection] =
    useState<DropDirection | null>(null);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({});
  const [isPositionReady, setIsPositionReady] = useState(false);

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

    // Determine drop direction based on position prop
    let targetDirection: DropDirection;
    if (position === 'top') {
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

    const finalDirection = initialDropDirection || targetDirection;
    const isDropUp = finalDirection === 'up';

    let topPosition: number;
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

    const portalStyleBase: CSSProperties = {
      position: 'fixed',
      left: `${leftPosition}px`,
      zIndex: DROPDOWN_CONSTANTS.PORTAL_Z_INDEX,
      top: `${topPosition}px`,
    };

    // Set width based on portalWidth value
    if (portalWidth === 'auto') {
      // Auto: use button width
      portalStyleBase.width = `${buttonRect.width}px`;
    } else if (portalWidth !== 'auto') {
      // Custom width: use provided value
      portalStyleBase.width =
        typeof portalWidth === 'number' ? `${portalWidth}px` : portalWidth;
    }

    setPortalStyle(portalStyleBase);
  }, [
    isOpen,
    initialDropDirection,
    buttonRef,
    dropdownMenuRef,
    portalWidth,
    position,
  ]);

  const resetPosition = useCallback(() => {
    setInitialDropDirection(null);
    setIsPositionReady(false);
  }, []);

  // Auto calculate position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Set position ready immediately, then calculate actual position
      setIsPositionReady(true);
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
  };
};
