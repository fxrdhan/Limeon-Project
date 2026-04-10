import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { VisibleBounds } from '../utils/chatViewportMenu';
import { useChatViewportMenu } from '../hooks/useChatViewportMenu';

const createRect = ({
  top,
  bottom,
  left = 0,
  right = 320,
}: {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}): DOMRect =>
  ({
    top,
    bottom,
    left,
    right,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('useChatViewportMenu', () => {
  beforeEach(() => {
    const requestAnimationFrameMock = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;
    const cancelAnimationFrameMock = vi.fn() as typeof cancelAnimationFrame;

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
    window.requestAnimationFrame = requestAnimationFrameMock;
    window.cancelAnimationFrame = cancelAnimationFrameMock;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('repositions a rendered menu above the bubble when the composer clips a side menu', () => {
    const messagesContainer = document.createElement('div');
    const anchor = document.createElement('div');
    const menuElement = document.createElement('div');
    const messagesContainerRef = createRef<HTMLDivElement>();
    const visibleBounds: VisibleBounds = {
      containerRect: createRect({ top: 0, bottom: 400 }),
      visibleBottom: 320,
    };

    document.body.append(messagesContainer);
    messagesContainer.append(anchor);
    messagesContainerRef.current = messagesContainer;
    messagesContainer.getBoundingClientRect = () => visibleBounds.containerRect;
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });

    anchor.getBoundingClientRect = () =>
      createRect({
        top: 100,
        bottom: 280,
        left: 160,
        right: 288,
      });

    const { result } = renderHook(() =>
      useChatViewportMenu({
        getVisibleMessagesBounds: () => visibleBounds,
        messagesContainerRef,
      })
    );

    act(() => {
      result.current.toggleMessageMenu(anchor, 'message-1', 'left');
    });

    expect(result.current.menuPlacement).toBe('left');

    menuElement.dataset.chatMenuId = 'message-1';
    menuElement.getBoundingClientRect = () =>
      createRect({
        top: 140,
        bottom: 360,
        left: 32,
        right: 152,
      });
    messagesContainer.append(menuElement);

    act(() => {
      messagesContainer.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.menuPlacement).toBe('down');
  });

  it('repositions a rendered menu below the bubble when the header clips a side menu', () => {
    const messagesContainer = document.createElement('div');
    const anchor = document.createElement('div');
    const menuElement = document.createElement('div');
    const messagesContainerRef = createRef<HTMLDivElement>();
    const visibleBounds: VisibleBounds = {
      containerRect: createRect({ top: 0, bottom: 400 }),
      visibleBottom: 320,
    };

    document.body.append(messagesContainer);
    messagesContainer.append(anchor);
    messagesContainerRef.current = messagesContainer;
    messagesContainer.getBoundingClientRect = () => visibleBounds.containerRect;
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });

    anchor.getBoundingClientRect = () =>
      createRect({
        top: 80,
        bottom: 260,
        left: 32,
        right: 160,
      });

    const { result } = renderHook(() =>
      useChatViewportMenu({
        getVisibleMessagesBounds: () => visibleBounds,
        messagesContainerRef,
      })
    );

    act(() => {
      result.current.toggleMessageMenu(anchor, 'message-2', 'right');
    });

    expect(result.current.menuPlacement).toBe('right');

    menuElement.dataset.chatMenuId = 'message-2';
    menuElement.getBoundingClientRect = () =>
      createRect({
        top: 60,
        bottom: 280,
        left: 168,
        right: 288,
      });
    messagesContainer.append(menuElement);

    act(() => {
      messagesContainer.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.menuPlacement).toBe('up');
  });
});
