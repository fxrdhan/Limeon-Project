import { render } from '@testing-library/react';
import { TbCopy } from 'react-icons/tb';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import PopupMenuContent from './PopupMenuContent';

describe('PopupMenuContent', () => {
  beforeEach(() => {
    const requestAnimationFrameMock = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
    window.requestAnimationFrame = requestAnimationFrameMock;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('auto-focuses the first enabled action without scrolling the viewport', () => {
    const focusSpy = vi
      .spyOn(HTMLButtonElement.prototype, 'focus')
      .mockImplementation(() => {});

    render(
      <PopupMenuContent
        actions={[
          {
            label: 'Salin',
            icon: <TbCopy className="h-4 w-4" />,
            onClick: () => {},
          },
        ]}
        enableArrowNavigation
        autoFocusFirstItem
      />
    );

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
