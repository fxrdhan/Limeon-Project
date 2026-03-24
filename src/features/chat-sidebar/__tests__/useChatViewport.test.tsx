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
import { useChatViewport } from '../hooks/useChatViewport';

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

describe('useChatViewport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const requestAnimationFrameMock = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;
    const cancelAnimationFrameMock = vi.fn() as typeof cancelAnimationFrame;
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
    window.requestAnimationFrame = requestAnimationFrameMock;
    window.cancelAnimationFrame = cancelAnimationFrameMock;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces read receipt checks while the user is actively scrolling', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const messageBubble = document.createElement('div');

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 120,
      writable: true,
    });
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    messageBubble.getBoundingClientRect = () => createRect(60, 120);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>([['incoming-1', messageBubble]]),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const markMessageIdsAsRead = vi.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() =>
      useChatViewport({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [
          {
            id: 'incoming-1',
            sender_id: 'user-b',
            receiver_id: 'user-a',
            is_read: false,
          },
        ],
        userId: 'user-a',
        targetUserId: 'user-b',
        messagesCount: 1,
        loading: false,
        messageInputHeight: 22,
        composerContextualOffset: 0,
        isMessageInputMultiline: false,
        pendingComposerAttachmentsCount: 0,
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        editingMessageId: null,
        focusMessageComposer: vi.fn(),
        markMessageIdsAsRead,
        messagesContainerRef,
        messagesEndRef,
        composerContainerRef,
        chatHeaderContainerRef,
        messageBubbleRefs,
      })
    );

    act(() => {
      vi.runAllTimers();
    });
    markMessageIdsAsRead.mockClear();

    act(() => {
      messagesContainer.dispatchEvent(new Event('scroll'));
      messagesContainer.dispatchEvent(new Event('scroll'));
      messagesContainer.dispatchEvent(new Event('scroll'));
    });

    act(() => {
      vi.advanceTimersByTime(89);
    });
    expect(markMessageIdsAsRead).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(markMessageIdsAsRead).toHaveBeenCalledTimes(1);
    expect(markMessageIdsAsRead).toHaveBeenCalledWith(['incoming-1']);

    unmount();
  });

  it('does not mark an incoming message as read while it is still hidden behind the sticky header', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const messageBubble = document.createElement('div');

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 120,
      writable: true,
    });
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    chatHeaderContainer.getBoundingClientRect = () => createRect(0, 100);
    messageBubble.getBoundingClientRect = () => createRect(80, 140);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>([['incoming-1', messageBubble]]),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const markMessageIdsAsRead = vi.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() =>
      useChatViewport({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [
          {
            id: 'incoming-1',
            sender_id: 'user-b',
            receiver_id: 'user-a',
            is_read: false,
          },
        ],
        userId: 'user-a',
        targetUserId: 'user-b',
        messagesCount: 1,
        loading: false,
        messageInputHeight: 22,
        composerContextualOffset: 0,
        isMessageInputMultiline: false,
        pendingComposerAttachmentsCount: 0,
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        editingMessageId: null,
        focusMessageComposer: vi.fn(),
        markMessageIdsAsRead,
        messagesContainerRef,
        messagesEndRef,
        composerContainerRef,
        chatHeaderContainerRef,
        messageBubbleRefs,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(markMessageIdsAsRead).not.toHaveBeenCalled();

    unmount();
  });

  it('marks a tall incoming message as read when a meaningful portion is visible below the sticky header', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const messageBubble = document.createElement('div');

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 120,
      writable: true,
    });
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    chatHeaderContainer.getBoundingClientRect = () => createRect(0, 100);
    messageBubble.getBoundingClientRect = () => createRect(80, 240);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>([['incoming-1', messageBubble]]),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const markMessageIdsAsRead = vi.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() =>
      useChatViewport({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [
          {
            id: 'incoming-1',
            sender_id: 'user-b',
            receiver_id: 'user-a',
            is_read: false,
          },
        ],
        userId: 'user-a',
        targetUserId: 'user-b',
        messagesCount: 1,
        loading: false,
        messageInputHeight: 22,
        composerContextualOffset: 0,
        isMessageInputMultiline: false,
        pendingComposerAttachmentsCount: 0,
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        editingMessageId: null,
        focusMessageComposer: vi.fn(),
        markMessageIdsAsRead,
        messagesContainerRef,
        messagesEndRef,
        composerContainerRef,
        chatHeaderContainerRef,
        messageBubbleRefs,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(markMessageIdsAsRead).toHaveBeenCalledWith(['incoming-1']);

    unmount();
  });

  it('uses the post-scroll menu placement immediately when the bubble starts behind the header overlay', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const anchor = document.createElement('div');
    const anchorDocumentTop = 212;
    const anchorHeight = 96;
    let scrollTop = 120;

    document.body.append(messagesContainer);
    messagesContainer.append(anchor);

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: value => {
        scrollTop = value;
      },
    });
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);
    anchor.getBoundingClientRect = () =>
      ({
        top: anchorDocumentTop - scrollTop,
        bottom: anchorDocumentTop - scrollTop + anchorHeight,
        left: 156,
        right: 284,
        width: 128,
        height: anchorHeight,
        x: 156,
        y: anchorDocumentTop - scrollTop,
        toJSON: () => ({}),
      }) as DOMRect;

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const { result } = renderHook(() =>
      useChatViewport({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        userId: 'user-a',
        targetUserId: 'user-b',
        messagesCount: 0,
        loading: false,
        messageInputHeight: 22,
        composerContextualOffset: 0,
        isMessageInputMultiline: false,
        pendingComposerAttachmentsCount: 0,
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        editingMessageId: null,
        focusMessageComposer: vi.fn(),
        markMessageIdsAsRead: vi.fn().mockResolvedValue(undefined),
        messagesContainerRef,
        messagesEndRef,
        composerContainerRef,
        chatHeaderContainerRef,
        messageBubbleRefs,
      })
    );

    act(() => {
      result.current.toggleMessageMenu(anchor, 'message-1', 'left');
    });

    expect(result.current.menuPlacement).toBe('left');
    expect(messagesContainer.scrollTop).toBe(76);

    messagesContainer.remove();
  });

  it('repositions an open message menu while the user scrolls', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const anchor = document.createElement('div');
    const anchorHeight = 96;
    let anchorDocumentTop = 212;
    let scrollTop = 120;

    document.body.append(messagesContainer);
    messagesContainer.append(anchor);

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: value => {
        scrollTop = value;
      },
    });
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);
    anchor.getBoundingClientRect = () =>
      ({
        top: anchorDocumentTop - scrollTop,
        bottom: anchorDocumentTop - scrollTop + anchorHeight,
        left: 156,
        right: 284,
        width: 128,
        height: anchorHeight,
        x: 156,
        y: anchorDocumentTop - scrollTop,
        toJSON: () => ({}),
      }) as DOMRect;

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const { result } = renderHook(() =>
      useChatViewport({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        userId: 'user-a',
        targetUserId: 'user-b',
        messagesCount: 0,
        loading: false,
        messageInputHeight: 22,
        composerContextualOffset: 0,
        isMessageInputMultiline: false,
        pendingComposerAttachmentsCount: 0,
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        editingMessageId: null,
        focusMessageComposer: vi.fn(),
        markMessageIdsAsRead: vi.fn().mockResolvedValue(undefined),
        messagesContainerRef,
        messagesEndRef,
        composerContainerRef,
        chatHeaderContainerRef,
        messageBubbleRefs,
      })
    );

    act(() => {
      result.current.toggleMessageMenu(anchor, 'message-1', 'left');
    });

    expect(result.current.menuPlacement).toBe('left');
    expect(messagesContainer.scrollTop).toBe(76);

    act(() => {
      anchorDocumentTop = scrollTop + 240;
      messagesContainer.dispatchEvent(new Event('scroll'));
      vi.runAllTimers();
    });

    expect(result.current.menuPlacement).toBe('left');
    expect(messagesContainer.scrollTop).toBe(76);

    messagesContainer.remove();
  });

  it('auto-scrolls the messages viewport when opening a menu for a bubble near the composer', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const anchor = document.createElement('div');
    const anchorDocumentTop = 368;
    const anchorHeight = 96;
    let scrollTop = 120;

    document.body.append(messagesContainer);
    messagesContainer.append(anchor);

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: value => {
        scrollTop = value;
      },
    });
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);
    anchor.getBoundingClientRect = () =>
      ({
        top: anchorDocumentTop - scrollTop,
        bottom: anchorDocumentTop - scrollTop + anchorHeight,
        left: 156,
        right: 284,
        width: 128,
        height: anchorHeight,
        x: 156,
        y: anchorDocumentTop - scrollTop,
        toJSON: () => ({}),
      }) as DOMRect;

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const { result } = renderHook(() =>
      useChatViewport({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        userId: 'user-a',
        targetUserId: 'user-b',
        messagesCount: 0,
        loading: false,
        messageInputHeight: 22,
        composerContextualOffset: 0,
        isMessageInputMultiline: false,
        pendingComposerAttachmentsCount: 0,
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        editingMessageId: null,
        focusMessageComposer: vi.fn(),
        markMessageIdsAsRead: vi.fn().mockResolvedValue(undefined),
        messagesContainerRef,
        messagesEndRef,
        composerContainerRef,
        chatHeaderContainerRef,
        messageBubbleRefs,
      })
    );

    act(() => {
      result.current.toggleMessageMenu(anchor, 'message-1', 'left');
    });

    expect(result.current.openMenuMessageId).toBe('message-1');
    expect(messagesContainer.scrollTop).toBe(152);

    messagesContainer.remove();
  });

  it('closes the message menu when its anchor scrolls out of the visible viewport', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');
    const anchor = document.createElement('div');

    let anchorTop = 220;
    let anchorBottom = 316;

    document.body.append(messagesContainer);
    messagesContainer.append(anchor);

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 120,
      writable: true,
    });
    messagesContainer.scrollTo = vi.fn();
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);
    anchor.getBoundingClientRect = () =>
      ({
        top: anchorTop,
        bottom: anchorBottom,
        left: 156,
        right: 284,
        width: 128,
        height: anchorBottom - anchorTop,
        x: 156,
        y: anchorTop,
        toJSON: () => ({}),
      }) as DOMRect;

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const { result } = renderHook(() =>
      useChatViewport({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        userId: 'user-a',
        targetUserId: 'user-b',
        messagesCount: 0,
        loading: false,
        messageInputHeight: 22,
        composerContextualOffset: 0,
        isMessageInputMultiline: false,
        pendingComposerAttachmentsCount: 0,
        normalizedMessageSearchQuery: '',
        isMessageSearchMode: false,
        activeSearchMessageId: null,
        searchNavigationTick: 0,
        editingMessageId: null,
        focusMessageComposer: vi.fn(),
        markMessageIdsAsRead: vi.fn().mockResolvedValue(undefined),
        messagesContainerRef,
        messagesEndRef,
        composerContainerRef,
        chatHeaderContainerRef,
        messageBubbleRefs,
      })
    );

    act(() => {
      result.current.toggleMessageMenu(anchor, 'message-1', 'left');
    });

    expect(result.current.openMenuMessageId).toBe('message-1');

    act(() => {
      anchorTop = 12;
      anchorBottom = 108;
      messagesContainer.dispatchEvent(new Event('scroll'));
      vi.runAllTimers();
    });

    expect(result.current.openMenuMessageId).toBeNull();

    messagesContainer.remove();
  });

  it('keeps the user position when a new latest message arrives after the initial open pin', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');

    let scrollTop = 0;
    let scrollHeight = 800;
    let messagesEndTop = 760;

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeight,
    });
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
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    messagesEnd.getBoundingClientRect = () =>
      createRect(messagesEndTop, messagesEndTop);

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const markMessageIdsAsRead = vi.fn().mockResolvedValue(undefined);
    const initialMessages = [
      {
        id: 'message-1',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        is_read: false,
      },
    ];

    const { result, rerender, unmount } = renderHook(
      ({ messages, messagesCount }) =>
        useChatViewport({
          isOpen: true,
          currentChannelId: 'channel-1',
          messages,
          userId: 'user-a',
          targetUserId: 'user-b',
          messagesCount,
          loading: false,
          messageInputHeight: 22,
          composerContextualOffset: 0,
          isMessageInputMultiline: false,
          pendingComposerAttachmentsCount: 0,
          normalizedMessageSearchQuery: '',
          isMessageSearchMode: false,
          activeSearchMessageId: null,
          searchNavigationTick: 0,
          editingMessageId: null,
          focusMessageComposer: vi.fn(),
          markMessageIdsAsRead,
          messagesContainerRef,
          messagesEndRef,
          composerContainerRef,
          chatHeaderContainerRef,
          messageBubbleRefs,
        }),
      {
        initialProps: {
          messages: initialMessages,
          messagesCount: initialMessages.length,
        },
      }
    );

    act(() => {
      vi.runAllTimers();
    });

    scrollTo.mockClear();

    act(() => {
      scrollTop = 120;
      messagesContainer.dispatchEvent(new Event('scroll'));
      vi.runAllTimers();
    });

    expect(result.current.isAtBottom).toBe(false);

    scrollHeight = 900;
    messagesEndTop = 860;

    const nextMessages = [
      ...initialMessages,
      {
        id: 'message-2',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        is_read: false,
      },
    ];

    act(() => {
      rerender({
        messages: nextMessages,
        messagesCount: nextMessages.length,
      });
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.hasNewMessages).toBe(true);

    unmount();
  });

  it('keeps the latest bubble visible while composer resize finishes settling', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');

    let scrollTop = 452;
    let scrollHeight = 852;
    let composerTop = 320;
    let composerHeight = 80;
    const endMarkerContentTop = 760;

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeight,
    });
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
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      get: () => composerHeight,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () =>
      createRect(composerTop, composerTop + composerHeight);
    messagesEnd.getBoundingClientRect = () =>
      createRect(
        endMarkerContentTop - scrollTop,
        endMarkerContentTop - scrollTop
      );

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const markMessageIdsAsRead = vi.fn().mockResolvedValue(undefined);
    const messages = [
      {
        id: 'message-1',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        is_read: false,
      },
    ];

    const { result, rerender, unmount } = renderHook(
      ({ messageInputHeight }) =>
        useChatViewport({
          isOpen: true,
          currentChannelId: 'channel-1',
          messages,
          userId: 'user-a',
          targetUserId: 'user-b',
          messagesCount: messages.length,
          loading: false,
          messageInputHeight,
          composerContextualOffset: 0,
          isMessageInputMultiline: messageInputHeight > 22,
          pendingComposerAttachmentsCount: 0,
          normalizedMessageSearchQuery: '',
          isMessageSearchMode: false,
          activeSearchMessageId: null,
          searchNavigationTick: 0,
          editingMessageId: null,
          focusMessageComposer: vi.fn(),
          markMessageIdsAsRead,
          messagesContainerRef,
          messagesEndRef,
          composerContainerRef,
          chatHeaderContainerRef,
          messageBubbleRefs,
        }),
      {
        initialProps: {
          messageInputHeight: 22,
        },
      }
    );

    act(() => {
      vi.runAllTimers();
    });

    scrollTo.mockClear();

    composerTop = 260;
    composerHeight = 140;

    act(() => {
      rerender({
        messageInputHeight: 86,
      });
    });

    expect(scrollTop).toBe(452);
    expect(scrollTo).toHaveBeenNthCalledWith(1, {
      behavior: 'auto',
      top: 452,
    });

    scrollHeight = 912;

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: 'auto',
      top: 512,
    });
    expect(scrollTop).toBe(512);
    expect(result.current.isAtBottom).toBe(true);

    unmount();
  });

  it('does not surface a new-message indicator when older history is prepended', () => {
    const messagesContainer = document.createElement('div');
    const messagesEnd = document.createElement('div');
    const composerContainer = document.createElement('div');
    const chatHeaderContainer = document.createElement('div');

    Object.defineProperty(messagesContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(messagesContainer, 'scrollTop', {
      configurable: true,
      value: 120,
      writable: true,
    });
    messagesContainer.scrollTo = vi.fn();
    Object.defineProperty(composerContainer, 'offsetHeight', {
      configurable: true,
      value: 80,
    });

    messagesContainer.getBoundingClientRect = () => createRect(0, 400);
    composerContainer.getBoundingClientRect = () => createRect(320, 400);
    messagesEnd.getBoundingClientRect = () => createRect(760, 760);

    const messagesContainerRef = createRef<HTMLDivElement>();
    const messagesEndRef = createRef<HTMLDivElement>();
    const composerContainerRef = createRef<HTMLDivElement>();
    const chatHeaderContainerRef = createRef<HTMLDivElement>();
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };

    messagesContainerRef.current = messagesContainer;
    messagesEndRef.current = messagesEnd;
    composerContainerRef.current = composerContainer;
    chatHeaderContainerRef.current = chatHeaderContainer;

    const markMessageIdsAsRead = vi.fn().mockResolvedValue(undefined);
    const initialMessages = [
      {
        id: 'message-latest',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        is_read: false,
      },
    ];

    const { result, rerender, unmount } = renderHook(
      ({ messages, messagesCount }) =>
        useChatViewport({
          isOpen: true,
          currentChannelId: 'channel-1',
          messages,
          userId: 'user-a',
          targetUserId: 'user-b',
          messagesCount,
          loading: false,
          messageInputHeight: 22,
          composerContextualOffset: 0,
          isMessageInputMultiline: false,
          pendingComposerAttachmentsCount: 0,
          normalizedMessageSearchQuery: '',
          isMessageSearchMode: false,
          activeSearchMessageId: null,
          searchNavigationTick: 0,
          editingMessageId: null,
          focusMessageComposer: vi.fn(),
          markMessageIdsAsRead,
          messagesContainerRef,
          messagesEndRef,
          composerContainerRef,
          chatHeaderContainerRef,
          messageBubbleRefs,
        }),
      {
        initialProps: {
          messages: initialMessages,
          messagesCount: initialMessages.length,
        },
      }
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.hasNewMessages).toBe(false);

    const olderMessages = [
      {
        id: 'message-older',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        is_read: true,
      },
      ...initialMessages,
    ];

    rerender({
      messages: olderMessages,
      messagesCount: olderMessages.length,
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.hasNewMessages).toBe(false);

    unmount();
  });
});
