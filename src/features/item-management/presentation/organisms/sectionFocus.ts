const SECTION_CONTENT_SELECTOR = '[data-section-content]';
const FOCUSABLE_SELECTOR =
  'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

export const getFirstFocusableSectionField = (
  sectionElement: ParentNode | null
) => {
  const container = sectionElement?.querySelector<HTMLElement>(
    SECTION_CONTENT_SELECTOR
  );
  if (!container) return null;

  return container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
};

export const focusFirstSectionField = (sectionElement: ParentNode | null) => {
  getFirstFocusableSectionField(sectionElement)?.focus();
};
