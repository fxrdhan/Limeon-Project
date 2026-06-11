export const scrollElementToTop = (
  container: HTMLDivElement,
  top: number,
  behavior: ScrollBehavior
) => {
  if (typeof container.scrollTo === 'function') {
    container.scrollTo({
      top,
      behavior,
    });
    return;
  }

  container.scrollTop = top;
};
