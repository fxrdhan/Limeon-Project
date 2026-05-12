import { useEffect } from 'react';

type IsolatedElementState = {
  element: HTMLElement;
  inert: boolean;
  ariaHidden: string | null;
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
    const previousStates: IsolatedElementState[] = isolatedElements.map(
      element => ({
        element,
        inert: Boolean(element.inert),
        ariaHidden: element.getAttribute('aria-hidden'),
      })
    );

    isolatedElements.forEach(element => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    return () => {
      previousStates.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });
    };
  }, [enabled, portalElement]);
};
