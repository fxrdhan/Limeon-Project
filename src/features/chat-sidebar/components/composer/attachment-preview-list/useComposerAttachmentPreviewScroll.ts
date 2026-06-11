import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { ComposerAttachmentPreviewItem } from '../../../types';
import type { ComposerAttachmentPreviewListProps } from './types';

const COMPOSER_ATTACHMENT_FOG_CLEARANCE = 56;
const MENU_REPOSITION_RESUME_DELAY_MS = 150;

export const useComposerAttachmentPreviewScroll = ({
  attachments,
  imageActionsButtonRef,
  isSelectionMode,
  onCloseImageActionsMenu,
  onMenuRepositionPauseChange,
  onScrollStateChange,
  onToggleImageActionsMenu,
  openImageActionsAttachmentId,
  selectedAttachmentIds,
}: {
  attachments: ComposerAttachmentPreviewItem[];
  imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
  isSelectionMode: boolean;
  onCloseImageActionsMenu?: () => void;
  onMenuRepositionPauseChange?: (isPaused: boolean) => void;
  onScrollStateChange?: ComposerAttachmentPreviewListProps['onScrollStateChange'];
  onToggleImageActionsMenu: (attachmentId: string) => void;
  openImageActionsAttachmentId: string | null;
  selectedAttachmentIds: string[];
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const attachmentRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isMenuRepositionPausedRef = useRef(false);
  const menuRepositionResumeTimeoutRef = useRef<number | null>(null);

  const updateScrollState = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !onScrollStateChange) {
      return;
    }

    const hasOverflow =
      scrollContainer.scrollHeight - scrollContainer.clientHeight > 1;
    const remainingScrollDistance =
      scrollContainer.scrollHeight -
      scrollContainer.clientHeight -
      scrollContainer.scrollTop;

    onScrollStateChange({
      hasOverflow,
      isAtTop: scrollContainer.scrollTop <= 2,
      isAtBottom: !hasOverflow || remainingScrollDistance <= 2,
    });
  }, [onScrollStateChange]);

  const updateOpenAttachmentMenuVisibility = useCallback(() => {
    if (!openImageActionsAttachmentId || !onCloseImageActionsMenu) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const actionTriggerButton = imageActionsButtonRef.current;
    if (!scrollContainer || !actionTriggerButton) {
      return;
    }

    const scrollContainerRect = scrollContainer.getBoundingClientRect();
    const triggerRect = actionTriggerButton.getBoundingClientRect();
    const isTriggerVisible =
      triggerRect.bottom > scrollContainerRect.top &&
      triggerRect.top < scrollContainerRect.bottom;

    if (!isTriggerVisible) {
      onCloseImageActionsMenu();
    }
  }, [
    imageActionsButtonRef,
    onCloseImageActionsMenu,
    openImageActionsAttachmentId,
  ]);

  const setAttachmentRowRef = useCallback(
    (attachmentId: string, node: HTMLDivElement | null) => {
      if (node) {
        attachmentRowRefs.current.set(attachmentId, node);
        return;
      }

      attachmentRowRefs.current.delete(attachmentId);
    },
    []
  );

  const getAttachmentFogAwareScrollTarget = useCallback(
    (attachmentId: string) => {
      const scrollContainer = scrollContainerRef.current;
      const attachmentRow = attachmentRowRefs.current.get(attachmentId);
      if (!scrollContainer || !attachmentRow) {
        return null;
      }

      const currentScrollTop = scrollContainer.scrollTop;
      const hasOverflow =
        scrollContainer.scrollHeight - scrollContainer.clientHeight > 1;
      const remainingScrollDistance =
        scrollContainer.scrollHeight -
        scrollContainer.clientHeight -
        currentScrollTop;
      const topClearance =
        isSelectionMode || currentScrollTop > 2
          ? COMPOSER_ATTACHMENT_FOG_CLEARANCE
          : 0;
      const bottomClearance =
        isSelectionMode || (hasOverflow && remainingScrollDistance > 2)
          ? COMPOSER_ATTACHMENT_FOG_CLEARANCE
          : 0;
      const visibleTop = currentScrollTop + topClearance;
      const visibleBottom =
        currentScrollTop + scrollContainer.clientHeight - bottomClearance;
      const attachmentTop = attachmentRow.offsetTop;
      const attachmentBottom = attachmentTop + attachmentRow.offsetHeight;

      if (attachmentTop < visibleTop) {
        return attachmentTop - topClearance;
      }

      if (attachmentBottom > visibleBottom) {
        return (
          attachmentBottom - scrollContainer.clientHeight + bottomClearance
        );
      }

      return null;
    },
    [isSelectionMode]
  );

  const setMenuRepositionPaused = useCallback(
    (isPaused: boolean) => {
      if (
        !openImageActionsAttachmentId ||
        !onMenuRepositionPauseChange ||
        isMenuRepositionPausedRef.current === isPaused
      ) {
        return;
      }

      isMenuRepositionPausedRef.current = isPaused;
      onMenuRepositionPauseChange(isPaused);
    },
    [onMenuRepositionPauseChange, openImageActionsAttachmentId]
  );

  const scheduleMenuRepositionResume = useCallback(() => {
    if (!isMenuRepositionPausedRef.current) {
      return;
    }

    if (menuRepositionResumeTimeoutRef.current !== null) {
      window.clearTimeout(menuRepositionResumeTimeoutRef.current);
    }

    menuRepositionResumeTimeoutRef.current = window.setTimeout(() => {
      menuRepositionResumeTimeoutRef.current = null;
      setMenuRepositionPaused(false);
    }, MENU_REPOSITION_RESUME_DELAY_MS);
  }, [setMenuRepositionPaused]);

  const ensureAttachmentVisibleOutsideFog = useCallback(
    (attachmentId: string) => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) {
        return;
      }

      const currentScrollTop = scrollContainer.scrollTop;
      const targetScrollTop = getAttachmentFogAwareScrollTarget(attachmentId);
      if (targetScrollTop === null) {
        return;
      }

      const nextScrollTop = Math.min(
        Math.max(targetScrollTop, 0),
        Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
      );

      if (Math.abs(nextScrollTop - currentScrollTop) < 1) {
        return;
      }

      if (openImageActionsAttachmentId === attachmentId) {
        setMenuRepositionPaused(true);
        scheduleMenuRepositionResume();
      }

      if (typeof scrollContainer.scrollTo === 'function') {
        scrollContainer.scrollTo({
          top: nextScrollTop,
          behavior: 'smooth',
        });
        return;
      }

      scrollContainer.scrollTop = nextScrollTop;
    },
    [
      getAttachmentFogAwareScrollTarget,
      openImageActionsAttachmentId,
      scheduleMenuRepositionResume,
      setMenuRepositionPaused,
    ]
  );

  const handleAttachmentMenuIntent = useCallback(
    (attachmentId: string) => {
      const shouldPauseBeforeOpen =
        openImageActionsAttachmentId !== attachmentId &&
        getAttachmentFogAwareScrollTarget(attachmentId) !== null;

      if (shouldPauseBeforeOpen) {
        onMenuRepositionPauseChange?.(true);
      }

      onToggleImageActionsMenu(attachmentId);
    },
    [
      getAttachmentFogAwareScrollTarget,
      onMenuRepositionPauseChange,
      onToggleImageActionsMenu,
      openImageActionsAttachmentId,
    ]
  );

  useEffect(() => {
    if (!onScrollStateChange) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    updateScrollState();
    updateOpenAttachmentMenuVisibility();

    const handleScroll = () => {
      updateScrollState();
      updateOpenAttachmentMenuVisibility();
      scheduleMenuRepositionResume();
    };

    scrollContainer.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
      updateOpenAttachmentMenuVisibility();
    });
    resizeObserver.observe(scrollContainer);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [
    attachments,
    isSelectionMode,
    onScrollStateChange,
    scheduleMenuRepositionResume,
    updateOpenAttachmentMenuVisibility,
    updateScrollState,
  ]);

  useEffect(() => {
    updateOpenAttachmentMenuVisibility();
  }, [updateOpenAttachmentMenuVisibility]);

  useEffect(() => {
    if (openImageActionsAttachmentId) {
      return;
    }

    if (menuRepositionResumeTimeoutRef.current !== null) {
      window.clearTimeout(menuRepositionResumeTimeoutRef.current);
      menuRepositionResumeTimeoutRef.current = null;
    }

    if (!isMenuRepositionPausedRef.current) {
      return;
    }

    isMenuRepositionPausedRef.current = false;
    onMenuRepositionPauseChange?.(false);
  }, [onMenuRepositionPauseChange, openImageActionsAttachmentId]);

  useEffect(() => {
    return () => {
      if (menuRepositionResumeTimeoutRef.current !== null) {
        window.clearTimeout(menuRepositionResumeTimeoutRef.current);
        menuRepositionResumeTimeoutRef.current = null;
      }

      if (!isMenuRepositionPausedRef.current) {
        return;
      }

      isMenuRepositionPausedRef.current = false;
      onMenuRepositionPauseChange?.(false);
    };
  }, [onMenuRepositionPauseChange]);

  useEffect(() => {
    const activeAttachmentId =
      openImageActionsAttachmentId ??
      (isSelectionMode
        ? (selectedAttachmentIds[selectedAttachmentIds.length - 1] ?? null)
        : null);

    if (!activeAttachmentId) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      ensureAttachmentVisibleOutsideFog(activeAttachmentId);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    attachments,
    ensureAttachmentVisibleOutsideFog,
    isSelectionMode,
    openImageActionsAttachmentId,
    selectedAttachmentIds,
  ]);

  return {
    handleAttachmentMenuIntent,
    scrollContainerRef,
    setAttachmentRowRef,
  };
};
