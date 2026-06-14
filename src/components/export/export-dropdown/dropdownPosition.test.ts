import { afterEach, describe, expect, it } from 'vite-plus/test';
import { getExportDropdownPortalStyle } from './dropdownPosition';

const originalInnerWidth = window.innerWidth;
const originalScrollY = window.scrollY;

const setViewport = ({
  innerWidth,
  scrollY,
}: {
  innerWidth: number;
  scrollY: number;
}) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: innerWidth,
  });
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: scrollY,
  });
};

const button = ({ bottom, right }: { bottom: number; right: number }) =>
  ({
    getBoundingClientRect: () =>
      ({
        bottom,
        right,
      }) as DOMRect,
  }) as HTMLButtonElement;

describe('export dropdown portal position', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: originalScrollY,
    });
  });

  it('aligns the dropdown right edge to the trigger by default', () => {
    setViewport({ innerWidth: 800, scrollY: 20 });

    expect(
      getExportDropdownPortalStyle(button({ bottom: 100, right: 500 }))
    ).toEqual({
      left: '270px',
      position: 'fixed',
      top: '128px',
      width: '230px',
      zIndex: 50,
    });
  });

  it('clamps the dropdown to viewport margins', () => {
    setViewport({ innerWidth: 240, scrollY: 0 });

    expect(
      getExportDropdownPortalStyle(button({ bottom: 50, right: 20 }))
    ).toMatchObject({
      left: '8px',
      top: '58px',
    });

    setViewport({ innerWidth: 500, scrollY: 0 });

    expect(
      getExportDropdownPortalStyle(button({ bottom: 50, right: 900 }))
    ).toMatchObject({
      left: '262px',
      top: '58px',
    });
  });
});
