import { useState, useCallback, RefObject } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

export const useScrollState = (
  optionsContainerRef: RefObject<HTMLDivElement | null>
) => {
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    reachedBottom: false,
    scrolledFromTop: false,
  });

  const checkScroll = useCallback(() => {
    if (!optionsContainerRef.current) return;
    const container = optionsContainerRef.current;
    setScrollState({
      isScrollable: container.scrollHeight > container.clientHeight,
      reachedBottom:
        Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight
        ) < DROPDOWN_CONSTANTS.SCROLL_THRESHOLD,
      scrolledFromTop:
        container.scrollTop > DROPDOWN_CONSTANTS.SCROLL_THRESHOLD,
    });
  }, [optionsContainerRef]);

  return {
    scrollState,
    checkScroll,
  };
};
