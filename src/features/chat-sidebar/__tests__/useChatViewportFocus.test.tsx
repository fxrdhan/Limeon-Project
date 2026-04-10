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
import {
  CHAT_HEADER_OVERLAY_HEIGHT,
  EDIT_TARGET_FOCUS_PADDING,
} from '../constants';
import { useChatViewportFocus } from '../hooks/useChatViewportFocus';
import type { VisibleBounds } from '../utils/viewport-visibility';

const createRect = (top: number, bottom: number): DOMRect =>
  ({
    top,
    bottom,
    left: 0,
    right: 320,
    width: 320,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('useChatViewportFocus', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1)
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls reply targets below the full chat header overlay, not just the header DOM height', () => {
    const messagesContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const messageBubble = document.createElement('div');

    const bounds: VisibleBounds = {
      containerRect: createRect(0, 400),
      visibleBottom: 320,
    };
    const bubbleDocumentTop = 310;
    const bubbleHeight = 64;
    let scrollTop = 200;

    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: value => {
        scrollTop = value;
      },
    });

    const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      scrollTop = top ?? scrollTop;
    });
    messagesContainer.scrollTo =
      scrollTo as unknown as typeof messagesContainer.scrollTo;
    chatHeaderContainer.getBoundingClientRect = () => createRect(0, 100);
    messageBubble.getBoundingClientRect = () =>
      createRect(
        bubbleDocumentTop - scrollTop,
        bubbleDocumentTop - scrollTop + bubbleHeight
      );

    const messagesContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>([['message-1', messageBubble]]),
    };

    messagesContainerRef.current = messagesContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const closeMessageMenu = vi.fn();

    const { result } = renderHook(() =>
      useChatViewportFocus({
        getVisibleMessagesBounds: () => bounds,
        closeMessageMenu,
        chatHeaderContainerRef,
        messageBubbleRefs,
        messagesContainerRef,
        editingMessageId: null,
      })
    );

    act(() => {
      result.current.focusReplyTargetMessage('message-1');
    });

    expect(closeMessageMenu).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({
      top:
        200 -
        (CHAT_HEADER_OVERLAY_HEIGHT +
          EDIT_TARGET_FOCUS_PADDING -
          (bubbleDocumentTop - 200)),
      behavior: 'smooth',
    });
  });
});
