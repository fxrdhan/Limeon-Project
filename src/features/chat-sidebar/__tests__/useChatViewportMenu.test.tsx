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

  it('switches to the below-bubble placement when it has less vertical overflow than the above-bubble placement', () => {
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
        top: 150,
        bottom: 210,
        left: 120,
        right: 200,
      });
    Object.defineProperty(menuElement, 'offsetWidth', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(menuElement, 'offsetHeight', {
      configurable: true,
      value: 220,
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

    expect(result.current.menuPlacement).toBe('down');
    expect(result.current.menuVerticalAnchor).toBe('left');

    menuElement.dataset.chatMenuId = 'message-1';
    menuElement.getBoundingClientRect = () =>
      createRect({
        top: -78,
        bottom: 142,
        left: 120,
        right: 240,
      });
    messagesContainer.append(menuElement);

    act(() => {
      messagesContainer.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.menuPlacement).toBe('up');
    expect(result.current.menuVerticalAnchor).toBe('left');
  });

  it('keeps the below-bubble placement when it already has less vertical overflow, while still allowing right-edge alignment for horizontal clipping', () => {
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
        bottom: 140,
        left: 220,
        right: 304,
      });
    Object.defineProperty(menuElement, 'offsetWidth', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(menuElement, 'offsetHeight', {
      configurable: true,
      value: 220,
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

    expect(result.current.menuPlacement).toBe('up');
    expect(result.current.menuVerticalAnchor).toBe('left');

    menuElement.dataset.chatMenuId = 'message-2';
    menuElement.getBoundingClientRect = () =>
      createRect({
        top: 148,
        bottom: 368,
        left: 220,
        right: 340,
      });
    messagesContainer.append(menuElement);

    act(() => {
      messagesContainer.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.menuPlacement).toBe('up');
    expect(result.current.menuVerticalAnchor).toBe('right');
  });

  it('uses the target bubble geometry instead of a stale animated popup rect when switching menus quickly', () => {
    const messagesContainer = document.createElement('div');
    const firstAnchor = document.createElement('div');
    const secondAnchor = document.createElement('div');
    const secondMenuElement = document.createElement('div');
    const messagesContainerRef = createRef<HTMLDivElement>();
    const visibleBounds: VisibleBounds = {
      containerRect: createRect({ top: 0, bottom: 400 }),
      visibleBottom: 320,
    };

    document.body.append(messagesContainer);
    messagesContainer.append(firstAnchor, secondAnchor);
    messagesContainerRef.current = messagesContainer;
    messagesContainer.getBoundingClientRect = () => visibleBounds.containerRect;
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });

    firstAnchor.getBoundingClientRect = () =>
      createRect({
        top: 80,
        bottom: 140,
        left: 40,
        right: 124,
      });
    secondAnchor.getBoundingClientRect = () =>
      createRect({
        top: 80,
        bottom: 140,
        left: 220,
        right: 304,
      });

    Object.defineProperty(secondMenuElement, 'offsetWidth', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(secondMenuElement, 'offsetHeight', {
      configurable: true,
      value: 120,
    });
    secondMenuElement.dataset.chatMenuId = 'message-2';
    secondMenuElement.getBoundingClientRect = () =>
      createRect({
        top: 148,
        bottom: 268,
        left: 40,
        right: 160,
      });
    document.body.append(secondMenuElement);

    const { result } = renderHook(() =>
      useChatViewportMenu({
        getVisibleMessagesBounds: () => visibleBounds,
        messagesContainerRef,
      })
    );

    act(() => {
      result.current.toggleMessageMenu(firstAnchor, 'message-1', 'right');
    });

    act(() => {
      result.current.toggleMessageMenu(secondAnchor, 'message-2', 'right');
    });

    expect(result.current.menuPlacement).toBe('up');
    expect(result.current.menuVerticalAnchor).toBe('right');
  });
});
