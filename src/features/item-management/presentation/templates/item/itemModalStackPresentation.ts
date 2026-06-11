import type { CSSProperties } from 'react';
import { SECTION_ORDER, type AccordionSection } from './itemModalStackTypes';

interface StackPresentationState {
  activeIndex: number;
  isStackHovering: boolean;
  stackAboveEnabled: boolean;
  stackBelowEnabled: boolean;
}

export interface StackEffect {
  className: string;
  style: CSSProperties | undefined;
}

export const getStackClasses = (
  section: AccordionSection,
  state: StackPresentationState
) => {
  const { activeIndex, isStackHovering, stackAboveEnabled, stackBelowEnabled } =
    state;
  const index = SECTION_ORDER.indexOf(section);
  if (index === -1) return '';

  if (isStackHovering) {
    return index === 0 ? '' : 'mt-3';
  }

  if (index === 0 && activeIndex === -1) return '';

  if (activeIndex === -1) {
    return index === 0 ? '' : 'mt-3';
  }

  if (index === activeIndex) {
    return index === 0 ? 'relative' : 'relative mt-4';
  }

  if (index < activeIndex) {
    if (!stackAboveEnabled) {
      return index === 0 ? '' : 'relative mt-4';
    }
    return index === 0 ? 'relative' : 'relative -mt-6';
  }

  if (stackBelowEnabled) {
    return index === activeIndex + 1 ? 'relative mt-4' : 'relative -mt-6';
  }

  return 'relative mt-4';
};

export const getStackWrapperStyle = (
  section: AccordionSection,
  state: StackPresentationState
): CSSProperties | undefined => {
  const { activeIndex, isStackHovering, stackAboveEnabled, stackBelowEnabled } =
    state;
  if (isStackHovering) return undefined;
  const index = SECTION_ORDER.indexOf(section);
  if (index === -1 || activeIndex === -1) return undefined;
  if (index === activeIndex) return { zIndex: 30 };
  if (index > activeIndex && !stackBelowEnabled) return undefined;
  if (index < activeIndex && !stackAboveEnabled) {
    return undefined;
  }

  const depth = Math.abs(activeIndex - index);
  return { zIndex: Math.max(1, 20 - depth) };
};

export const getStackStyle = (
  section: AccordionSection,
  state: StackPresentationState
): CSSProperties | undefined => {
  const { activeIndex, isStackHovering, stackAboveEnabled, stackBelowEnabled } =
    state;
  if (isStackHovering) return undefined;
  const index = SECTION_ORDER.indexOf(section);
  if (index === -1 || activeIndex === -1 || index === activeIndex) {
    return undefined;
  }
  if (index > activeIndex && !stackBelowEnabled) return undefined;
  if (index < activeIndex && !stackAboveEnabled) {
    return undefined;
  }

  const depth = Math.abs(activeIndex - index);
  const blurAmount = Math.min(depth * 0.35, 1.2);
  const opacityValue = Math.max(0.82, 1 - depth * 0.04);
  const scaleValue = Math.max(0.98, 1 - depth * 0.01);

  return {
    filter: blurAmount ? `blur(${blurAmount}px)` : undefined,
    opacity: opacityValue,
    transform: `scale(${scaleValue})`,
  };
};

export const getStackEffect = (
  section: AccordionSection,
  state: StackPresentationState
): StackEffect => ({
  className:
    'origin-top transition-[transform,opacity,filter] duration-300 ease-out',
  style: getStackStyle(section, state),
});

export const getStackSectionFromTarget = (target: HTMLElement | null) => {
  if (!target) return null;
  const hoveredSectionEl = target.closest<HTMLElement>('[data-stack-section]');
  const hoveredSectionRaw = hoveredSectionEl?.dataset.stackSection;
  return hoveredSectionRaw === 'additional' ||
    hoveredSectionRaw === 'settings' ||
    hoveredSectionRaw === 'pricing' ||
    hoveredSectionRaw === 'conversion'
    ? (hoveredSectionRaw as AccordionSection)
    : null;
};

export const shouldTriggerStackExpand = (
  hoveredSection: AccordionSection,
  activeSection: AccordionSection | null
) => {
  if (hoveredSection === activeSection) return false;

  const hoveredIndex = SECTION_ORDER.indexOf(hoveredSection);
  const activeSectionIndex = activeSection
    ? SECTION_ORDER.indexOf(activeSection)
    : -1;
  if (hoveredIndex === -1 || activeSectionIndex === -1) {
    return false;
  }

  const shouldStackAbove = activeSectionIndex >= 2;
  const shouldStackBelow =
    activeSectionIndex !== -1 &&
    SECTION_ORDER.length - 1 - activeSectionIndex >= 2;

  if (hoveredIndex > activeSectionIndex && !shouldStackBelow) {
    return false;
  }
  if (hoveredIndex < activeSectionIndex && !shouldStackAbove) {
    return false;
  }
  if (
    hoveredIndex < activeSectionIndex &&
    activeSectionIndex - hoveredIndex === 1
  ) {
    return false;
  }
  if (
    hoveredIndex > activeSectionIndex &&
    hoveredIndex - activeSectionIndex === 1
  ) {
    return false;
  }

  return true;
};
