import { useEffect } from 'react';

type IsolatedElementState = {
  inert: boolean;
  ariaHidden: string | null;
  references: number;
};

const isolatedElementStates = new Map<HTMLElement, IsolatedElementState>();

const isolateElement = (element: HTMLElement) => {
  const currentState = isolatedElementStates.get(element);

  if (currentState) {
    currentState.references += 1;
  } else {
    isolatedElementStates.set(element, {
      inert: Boolean(element.inert),
      ariaHidden: element.getAttribute('aria-hidden'),
      references: 1,
    });
  }

  element.inert = true;
  element.setAttribute('aria-hidden', 'true');
};

const restoreElementIsolation = (element: HTMLElement) => {
  const currentState = isolatedElementStates.get(element);

  if (!currentState) return;

  currentState.references -= 1;
  if (currentState.references > 0) return;

  isolatedElementStates.delete(element);
  element.inert = currentState.inert;
  if (currentState.ariaHidden === null) {
    element.removeAttribute('aria-hidden');
  } else {
    element.setAttribute('aria-hidden', currentState.ariaHidden);
  }
};

const getIsolationParentElement = (
  element: HTMLElement
): HTMLElement | null => {
  if (element.parentElement) return element.parentElement;

  const root = element.getRootNode();
  if (
    typeof ShadowRoot !== 'undefined' &&
    root instanceof ShadowRoot &&
    root.host instanceof HTMLElement
  ) {
    return root.host;
  }

  return null;
};

const getModalBackgroundElements = (portalElement: HTMLElement) => {
  const backgroundElements = new Set<HTMLElement>();
  let currentElement: HTMLElement | null = portalElement;

  while (currentElement && currentElement !== document.body) {
    const parentElement = getIsolationParentElement(currentElement);

    if (!parentElement) break;

    Array.from(parentElement.children).forEach(element => {
      if (
        element instanceof HTMLElement &&
        element !== currentElement &&
        !element.contains(portalElement)
      ) {
        backgroundElements.add(element);
      }
    });

    currentElement = parentElement;
  }

  return Array.from(backgroundElements);
};

export const useCalendarModalIsolation = ({
  enabled,
  portalElement,
}: {
  enabled: boolean;
  portalElement: HTMLElement | null;
}) => {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    if (!portalElement) return;

    const isolatedElements = getModalBackgroundElements(portalElement);
    isolatedElements.forEach(isolateElement);

    return () => {
      isolatedElements.forEach(restoreElementIsolation);
    };
  }, [enabled, portalElement]);
};
