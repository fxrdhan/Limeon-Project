import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { ItemFormData, ItemModalProps } from '../../../shared/types';
import { getItemModalAutoOpenSection } from './itemModalAutoOpenSection';
import {
  getStackClasses as getStackClassesForState,
  getStackEffect as getStackEffectForState,
  getStackSectionFromTarget,
  getStackWrapperStyle as getStackWrapperStyleForState,
  shouldTriggerStackExpand as shouldTriggerStackExpandForState,
} from './itemModalStackPresentation';
import { SECTION_ORDER, type AccordionSection } from './itemModalStackTypes';

interface UseItemModalStackSectionsParams {
  itemId?: string;
  initialItemData?: ItemModalProps['initialItemData'];
  isOpen: boolean;
  formData: Partial<ItemFormData>;
  formLoading: boolean;
  conversionCount: number;
}

export const useItemModalStackSections = ({
  itemId,
  initialItemData,
  isOpen,
  formData,
  formLoading,
  conversionCount,
}: UseItemModalStackSectionsParams) => {
  const isEditSession = Boolean(itemId);
  const hasFormData =
    Boolean(formData.code?.trim()) ||
    Boolean(formData.name?.trim()) ||
    Boolean(formData.updated_at);
  const hasEditData =
    isEditSession && (hasFormData || Boolean(initialItemData));

  const [openSection, setOpenSection] = useState<AccordionSection | null>(() =>
    isEditSession ? null : 'additional'
  );
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const [isStackHovering, setIsStackHovering] = useState(false);
  const [isStackTransitioning, setIsStackTransitioning] = useState(false);
  const [isLevelPricingMode, setIsLevelPricingMode] = useState(false);
  const [lastOpenSection, setLastOpenSection] =
    useState<AccordionSection | null>(isEditSession ? null : 'additional');
  const hoverTimerRef = useRef<number | null>(null);
  const ignoreStackTapRef = useRef(false);
  const ignoreStackTapTimerRef = useRef<number | null>(null);

  const updateOpenSection = useCallback(
    (nextSection: AccordionSection | null) => {
      setOpenSection(nextSection);
      if (nextSection) {
        setLastOpenSection(nextSection);
      }
    },
    []
  );

  const toggleSection = useCallback(
    (section: AccordionSection) => {
      setHasUserToggled(true);
      if (openSection === section) {
        setOpenSection(null);
        setLastOpenSection(null);
        return;
      }

      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setIsStackHovering(false);
      setIsStackTransitioning(false);

      updateOpenSection(section);
    },
    [openSection, updateOpenSection]
  );

  const handleLevelPricingToggle = useCallback(
    (isOpenLevelPricing: boolean) => {
      setIsLevelPricingMode(isOpenLevelPricing);
      if (!isOpenLevelPricing) return;
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setIsStackHovering(false);
      setIsStackTransitioning(false);
      updateOpenSection('pricing');
    },
    [updateOpenSection]
  );

  const autoOpenSection = useMemo<AccordionSection | null>(() => {
    return getItemModalAutoOpenSection({
      conversionCount,
      formData,
      formLoading,
      hasEditData,
      hasFormData,
      initialItemData,
    });
  }, [
    conversionCount,
    formData,
    formLoading,
    hasEditData,
    hasFormData,
    initialItemData,
  ]);

  useEffect(() => {
    if (
      !isEditSession ||
      hasUserToggled ||
      !isOpen ||
      isStackHovering ||
      isStackTransitioning
    ) {
      return;
    }
    if (openSection || !autoOpenSection) return;
    const frameId = requestAnimationFrame(() => {
      updateOpenSection(autoOpenSection);
    });
    return () => cancelAnimationFrame(frameId);
  }, [
    autoOpenSection,
    hasUserToggled,
    isEditSession,
    isOpen,
    isStackHovering,
    isStackTransitioning,
    openSection,
    updateOpenSection,
  ]);

  const activeSection: AccordionSection | null = openSection;
  const effectiveSection = isStackHovering
    ? null
    : isStackTransitioning
      ? lastOpenSection
      : activeSection;

  const activeIndex = effectiveSection
    ? SECTION_ORDER.indexOf(effectiveSection)
    : -1;
  const stackAboveEnabled = activeIndex >= 2;
  const stackBelowEnabled =
    activeIndex !== -1 && SECTION_ORDER.length - 1 - activeIndex >= 2;

  const stackPresentationState = {
    activeIndex,
    isStackHovering,
    stackAboveEnabled,
    stackBelowEnabled,
  };
  const getStackClasses = (section: AccordionSection) =>
    getStackClassesForState(section, stackPresentationState);
  const getStackWrapperStyle = (section: AccordionSection) =>
    getStackWrapperStyleForState(section, stackPresentationState);
  const getStackEffect = (section: AccordionSection) =>
    getStackEffectForState(section, stackPresentationState);
  const shouldTriggerStackExpand = useCallback(
    (hoveredSection: AccordionSection) =>
      shouldTriggerStackExpandForState(hoveredSection, activeSection),
    [activeSection]
  );

  const startStackCollapse = useCallback(() => {
    if (isStackHovering || isStackTransitioning) return;
    if (openSection) {
      setLastOpenSection(openSection);
    }
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    setIsStackTransitioning(true);
    setOpenSection(null);
    hoverTimerRef.current = window.setTimeout(() => {
      setIsStackTransitioning(false);
      setIsStackHovering(true);
      hoverTimerRef.current = null;
    }, 220);
  }, [isStackHovering, isStackTransitioning, openSection]);

  const restoreStack = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsStackHovering(false);
    setIsStackTransitioning(false);
    const restoreSection: AccordionSection | null =
      openSection ??
      lastOpenSection ??
      (hasUserToggled ? null : isEditSession ? autoOpenSection : 'additional');

    if (restoreSection !== null) {
      requestAnimationFrame(() => {
        updateOpenSection(restoreSection);
      });
    }
  }, [
    autoOpenSection,
    hasUserToggled,
    isEditSession,
    lastOpenSection,
    openSection,
    updateOpenSection,
  ]);

  const handleStackMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const isOverIgnore = Boolean(
        target.closest('[data-stack-ignore="true"]')
      );
      const hoveredSection = getStackSectionFromTarget(target);

      if (isOverIgnore) {
        if (isStackHovering || isStackTransitioning) {
          restoreStack();
        }
        return;
      }

      if (
        isStackHovering &&
        hoveredSection &&
        hoveredSection === lastOpenSection
      ) {
        restoreStack();
        return;
      }

      if (!hoveredSection) {
        return;
      }

      if (hoveredSection === activeSection) {
        return;
      }

      if (!shouldTriggerStackExpand(hoveredSection)) {
        return;
      }

      startStackCollapse();
    },
    [
      activeSection,
      isStackHovering,
      isStackTransitioning,
      lastOpenSection,
      restoreStack,
      shouldTriggerStackExpand,
      startStackCollapse,
    ]
  );

  const handleStackMouseLeave = useCallback(() => {
    restoreStack();
  }, [restoreStack]);

  const focusSectionFirstField = useCallback((section: AccordionSection) => {
    let attempts = 0;
    const tryFocus = () => {
      const modal = document.querySelector(
        '[role="dialog"][aria-modal="true"]'
      );
      if (!modal) return;
      const sectionEl = modal.querySelector(
        `[data-stack-section="${section}"]`
      );
      const container = sectionEl?.querySelector<HTMLElement>(
        '[data-section-content]'
      );
      const preferredInput =
        section === 'pricing'
          ? container?.querySelector<HTMLInputElement>(
              'input[name="base_price"]'
            )
          : null;
      const firstFocusable =
        preferredInput ||
        container?.querySelector<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        );
      if (firstFocusable) {
        firstFocusable.focus();
        return;
      }
      if (attempts < 6) {
        attempts += 1;
        requestAnimationFrame(tryFocus);
      }
    };
    tryFocus();
  }, []);

  const openPricingSectionAndFocus = useCallback(() => {
    toggleSection('pricing');
    requestAnimationFrame(() => focusSectionFirstField('pricing'));
  }, [focusSectionFirstField, toggleSection]);

  const handleStackPointerDownCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-stack-ignore="true"]')) return;
      if (isStackHovering || isStackTransitioning) return;

      const tappedSection = getStackSectionFromTarget(target);
      if (!tappedSection) return;
      if (!shouldTriggerStackExpand(tappedSection)) return;

      startStackCollapse();
      ignoreStackTapRef.current = true;
      if (ignoreStackTapTimerRef.current) {
        window.clearTimeout(ignoreStackTapTimerRef.current);
      }
      ignoreStackTapTimerRef.current = window.setTimeout(() => {
        ignoreStackTapRef.current = false;
        ignoreStackTapTimerRef.current = null;
      }, 400);
      event.preventDefault();
      event.stopPropagation();
    },
    [
      isStackHovering,
      isStackTransitioning,
      shouldTriggerStackExpand,
      startStackCollapse,
    ]
  );

  const handleStackClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!ignoreStackTapRef.current) return;
      ignoreStackTapRef.current = false;
      if (ignoreStackTapTimerRef.current) {
        window.clearTimeout(ignoreStackTapTimerRef.current);
        ignoreStackTapTimerRef.current = null;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  useEffect(
    () => () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (ignoreStackTapTimerRef.current) {
        window.clearTimeout(ignoreStackTapTimerRef.current);
        ignoreStackTapTimerRef.current = null;
      }
    },
    []
  );

  const rightColumnProps: HTMLAttributes<HTMLDivElement> | undefined =
    isLevelPricingMode
      ? undefined
      : {
          onMouseMove: handleStackMouseMove,
          onMouseLeave: handleStackMouseLeave,
          onPointerDownCapture: handleStackPointerDownCapture,
          onClickCapture: handleStackClickCapture,
        };

  return {
    activeSection,
    getStackClasses,
    getStackEffect,
    getStackWrapperStyle,
    handleLevelPricingToggle,
    isLevelPricingMode,
    openPricingSectionAndFocus,
    rightColumnProps,
    toggleSection,
  };
};
