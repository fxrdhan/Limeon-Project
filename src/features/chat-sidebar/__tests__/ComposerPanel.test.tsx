import type { ComponentProps } from 'react';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import ComposerPanel from '../components/ComposerPanel';

const { mockPopupMenuContent } = vi.hoisted(() => ({
  mockPopupMenuContent: vi.fn((props: { header?: React.ReactNode }) => (
    <div>
      {props.header}
      popup content
    </div>
  )),
}));

const { mockImageUploader } = vi.hoisted(() => ({
  mockImageUploader: vi.fn(({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get:
        (_target, element) =>
        ({
          children,
          animate: _animate,
          exit: _exit,
          initial: _initial,
          layout: _layout,
          transition: _transition,
          ...props
        }: React.HTMLAttributes<HTMLElement> & {
          animate?: unknown;
          children?: React.ReactNode;
          exit?: unknown;
          initial?: unknown;
          layout?: unknown;
          transition?: unknown;
        }) =>
          React.createElement(element as string, props, children),
    }
  ),
}));

vi.mock('@/components/image-manager/PopupMenuContent', () => ({
  default: (props: { header?: React.ReactNode }) => mockPopupMenuContent(props),
}));

vi.mock('@/components/shared/popup-menu-popover', () => ({
  default: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/image-manager', () => ({
  default: (props: { children?: React.ReactNode }) => mockImageUploader(props),
}));

vi.mock('@/components/shared/image-expand-preview', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('../components/DocumentPreviewPortal', () => ({
  default: () => null,
}));

vi.mock('../components/composer/ComposerAttachmentPreviewList', () => ({
  default: () => null,
}));

vi.mock('../components/composer/ComposerEditBanner', () => ({
  default: () => null,
}));

type ComposerRuntime = ComponentProps<typeof ComposerPanel>['runtime'];

const buildComposerRuntime = () =>
  ({
    composer: {
      message:
        'https://shrtlink.works/bwdrrk3ugm dan https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
      editingMessagePreview: null,
      messageInputHeight: 40,
      isMessageInputMultiline: false,
      isSendSuccessGlowVisible: false,
      isLoadingAttachmentComposerAttachments: false,
      isAttachModalOpen: false,
      attachmentPastePromptUrl: null,
      isAttachmentPastePromptAttachmentCandidate: false,
      isAttachmentPastePromptShortenable: false,
      hoverableAttachmentCandidates: [
        {
          id: 'candidate-1',
          url: 'https://shrtlink.works/bwdrrk3ugm',
          pastedText: 'https://shrtlink.works/bwdrrk3ugm',
          rangeStart: 0,
          rangeEnd: 33,
        },
        {
          id: 'candidate-2',
          url: 'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
          pastedText:
            'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
          rangeStart: 38,
          rangeEnd: 120,
        },
      ],
      composerAttachmentPreviewItems: [],
      previewComposerImageAttachment: undefined,
      isComposerImageExpanded: false,
      isComposerImageExpandedVisible: false,
      attachButtonRef: { current: null },
      attachModalRef: { current: null },
      attachmentPastePromptRef: { current: null },
      imageInputRef: { current: null },
      documentInputRef: { current: null },
      audioInputRef: { current: null },
      handleMessageChange: vi.fn(),
      handleComposerPaste: vi.fn(),
      dismissAttachmentPastePrompt: vi.fn(),
      openAttachmentPastePrompt: vi.fn(),
      openComposerLinkPrompt: vi.fn(),
      handleEditAttachmentLink: vi.fn(),
      handleOpenAttachmentPastePromptLink: vi.fn(),
      handleCopyAttachmentPastePromptLink: vi.fn(),
      handleShortenAttachmentPastePromptLink: vi.fn(),
      handleUseAttachmentPasteAsUrl: vi.fn(),
      handleUseAttachmentPasteAsAttachment: vi.fn(),
      handleAttachButtonClick: vi.fn(),
      handleAttachImageClick: vi.fn(),
      handleAttachDocumentClick: vi.fn(),
      handleAttachAudioClick: vi.fn(),
      handleImageFileChange: vi.fn(),
      handleDocumentFileChange: vi.fn(),
      handleAudioFileChange: vi.fn(),
      cancelLoadingComposerAttachment: vi.fn(),
      removePendingComposerAttachment: vi.fn(),
      queueComposerImage: vi.fn(() => true),
      closeComposerImagePreview: vi.fn(),
    },
    previews: {
      openImageActionsAttachmentId: null,
      imageActionsMenuPosition: null,
      pdfCompressionMenuPosition: null,
      imageActions: [],
      pdfCompressionLevelActions: [],
      imageActionsButtonRef: { current: null },
      imageActionsMenuRef: { current: null },
      pdfCompressionMenuRef: { current: null },
      handleToggleImageActionsMenu: vi.fn(),
      composerDocumentPreviewUrl: null,
      composerDocumentPreviewName: '',
      isComposerDocumentPreviewVisible: false,
      closeComposerDocumentPreview: vi.fn(),
    },
    mutations: {
      handleKeyPress: vi.fn(),
      handleSendMessage: vi.fn(),
      handleCancelEditMessage: vi.fn(),
    },
    refs: {
      messageInputRef: { current: null },
      composerContainerRef: { current: null },
    },
    viewport: {
      focusEditingTargetMessage: vi.fn(),
    },
  }) as unknown as ComposerRuntime;

describe('ComposerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes first-item preselection behavior into the composer attachment popup', () => {
    const runtime = buildComposerRuntime();
    runtime.previews.openImageActionsAttachmentId = 'pending-image-1';
    runtime.previews.imageActionsMenuPosition = {
      top: 48,
      left: 64,
    };
    runtime.previews.imageActions = [
      {
        label: 'Buka',
        icon: <span>icon</span>,
        onClick: vi.fn(),
      },
      {
        label: 'Ganti',
        icon: <span>icon</span>,
        onClick: vi.fn(),
      },
    ];

    render(<ComposerPanel runtime={runtime} />);

    expect(mockPopupMenuContent).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: runtime.previews.imageActions,
        enableArrowNavigation: true,
        autoFocusFirstItem: true,
      })
    );
  });

  it('passes recommended preselection into the pdf compression submenu popup', () => {
    const runtime = buildComposerRuntime();
    runtime.previews.openImageActionsAttachmentId = 'pending-pdf-1';
    runtime.previews.pdfCompressionMenuPosition = {
      top: 72,
      left: 32,
    };
    runtime.previews.pdfCompressionLevelActions = [
      {
        label: 'Extreme',
        icon: <span>icon</span>,
        onClick: vi.fn(),
      },
      {
        label: 'Recommended',
        icon: <span>icon</span>,
        onClick: vi.fn(),
      },
      {
        label: 'Less',
        icon: <span>icon</span>,
        onClick: vi.fn(),
      },
    ];

    render(<ComposerPanel runtime={runtime} />);

    expect(mockPopupMenuContent).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: runtime.previews.pdfCompressionLevelActions,
        enableArrowNavigation: true,
        initialPreselectedIndex: 1,
      })
    );
  });

  it('renders each hoverable attachment link as a separate inline anchor', () => {
    const runtime = buildComposerRuntime();

    render(<ComposerPanel runtime={runtime} />);

    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(2);
    expect(links[0]?.textContent).toBe('https://shrtlink.works/bwdrrk3ugm');
    expect(links[1]?.textContent).toBe(
      'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
    );
    expect(screen.queryByRole('link', { name: ' dan ' })).toBeNull();

    fireEvent.mouseEnter(links[0]);

    expect(runtime.composer.openAttachmentPastePrompt).toHaveBeenCalledWith(
      runtime.composer.hoverableAttachmentCandidates[0]
    );
  });

  it('places the caret at the clicked inline url position', () => {
    const runtime = buildComposerRuntime();

    render(<ComposerPanel runtime={runtime} />);

    const firstLink = screen.getAllByRole('link')[0]!;
    const textNode = firstLink.firstChild;
    expect(textNode).toBeTruthy();

    Object.defineProperty(document, 'caretPositionFromPoint', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'caretRangeFromPoint', {
      configurable: true,
      value: vi.fn(() => {
        const range = document.createRange();
        range.setStart(textNode!, 8);
        return range;
      }),
    });

    fireEvent.mouseDown(firstLink, { clientX: 16, clientY: 8 });
    fireEvent.click(firstLink, { detail: 1 });

    expect(runtime.composer.handleEditAttachmentLink).toHaveBeenCalledWith(
      runtime.composer.hoverableAttachmentCandidates[0],
      {
        selectionStart: 8,
        selectionEnd: 8,
      }
    );
    expect(runtime.composer.handleEditAttachmentLink).toHaveBeenCalledTimes(1);
  });

  it('renders the attachment link popover without shorten action for shared links', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.attachmentPastePromptUrl =
      'https://shrtlink.works/bwdrrk3ugm';
    runtime.composer.isAttachmentPastePromptAttachmentCandidate = true;
    runtime.composer.isAttachmentPastePromptShortenable = false;

    render(<ComposerPanel runtime={runtime} />);

    const firstLink = screen.getAllByRole('link')[0]!;
    Object.defineProperty(firstLink, 'getBoundingClientRect', {
      value: () => ({
        x: 24,
        y: 48,
        width: 120,
        height: 20,
        top: 48,
        right: 144,
        bottom: 68,
        left: 24,
        toJSON: () => ({}),
      }),
    });

    fireEvent.mouseEnter(firstLink);

    expect(screen.getByText('Aksi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buka' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salin' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Shorten link' })).toBeNull();
    expect(screen.getByText('Tempel sebagai')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'URL' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Attachment' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Buka' }));

    expect(
      runtime.composer.handleOpenAttachmentPastePromptLink
    ).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Salin' }));

    expect(
      runtime.composer.handleCopyAttachmentPastePromptLink
    ).toHaveBeenCalledOnce();
  });

  it('renders plain message domains without a protocol as inline links', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.message = 'github.com';
    runtime.composer.hoverableAttachmentCandidates = [];

    render(<ComposerPanel runtime={runtime} />);

    const link = screen.getByRole('link', {
      name: 'github.com',
    });

    expect(link.getAttribute('href')).toBe('https://github.com/');

    fireEvent.mouseEnter(link);

    expect(runtime.composer.openComposerLinkPrompt).toHaveBeenCalledWith({
      url: 'https://github.com/',
      pastedText: 'github.com',
      rangeStart: 0,
      rangeEnd: 10,
    });
    expect(runtime.composer.openAttachmentPastePrompt).not.toHaveBeenCalled();
  });

  it('renders the generic link popover without shorten or paste-as actions', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.message = 'github.com';
    runtime.composer.hoverableAttachmentCandidates = [];
    runtime.composer.attachmentPastePromptUrl = 'https://github.com/';

    render(<ComposerPanel runtime={runtime} />);

    const link = screen.getByRole('link', {
      name: 'github.com',
    });
    Object.defineProperty(link, 'getBoundingClientRect', {
      value: () => ({
        x: 24,
        y: 48,
        width: 120,
        height: 20,
        top: 48,
        right: 144,
        bottom: 68,
        left: 24,
        toJSON: () => ({}),
      }),
    });

    fireEvent.mouseEnter(link);

    expect(screen.getByText('Aksi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buka' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salin' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Shorten link' })).toBeNull();
    expect(screen.queryByText('Tempel sebagai')).toBeNull();
    expect(screen.queryByRole('button', { name: 'URL' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Attachment' })).toBeNull();
  });

  it('renders the shorten action for direct chat asset links', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.message =
      'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc';
    runtime.composer.hoverableAttachmentCandidates = [];
    runtime.composer.attachmentPastePromptUrl =
      'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc';
    runtime.composer.isAttachmentPastePromptShortenable = true;

    render(<ComposerPanel runtime={runtime} />);

    const link = screen.getByRole('link', {
      name: 'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc',
    });
    Object.defineProperty(link, 'getBoundingClientRect', {
      value: () => ({
        x: 24,
        y: 48,
        width: 120,
        height: 20,
        top: 48,
        right: 144,
        bottom: 68,
        left: 24,
        toJSON: () => ({}),
      }),
    });

    fireEvent.mouseEnter(link);
    fireEvent.click(screen.getByRole('button', { name: 'Shorten link' }));

    expect(
      runtime.composer.handleShortenAttachmentPastePromptLink
    ).toHaveBeenCalledOnce();
  });

  it('keeps the hovered link node stable when paste-as actions become available', () => {
    const initialRuntime = buildComposerRuntime();
    initialRuntime.composer.message = 'github.com';
    initialRuntime.composer.hoverableAttachmentCandidates = [];
    initialRuntime.composer.attachmentPastePromptUrl = 'https://github.com/';

    const { rerender } = render(<ComposerPanel runtime={initialRuntime} />);

    const initialLink = screen.getByRole('link', {
      name: 'github.com',
    });
    Object.defineProperty(initialLink, 'getBoundingClientRect', {
      value: () => ({
        x: 24,
        y: 48,
        width: 120,
        height: 20,
        top: 48,
        right: 144,
        bottom: 68,
        left: 24,
        toJSON: () => ({}),
      }),
    });

    fireEvent.mouseEnter(initialLink);

    expect(screen.queryByText('Tempel sebagai')).toBeNull();

    const upgradedRuntime = buildComposerRuntime();
    upgradedRuntime.composer.message = 'github.com';
    upgradedRuntime.composer.attachmentPastePromptUrl = 'https://github.com/';
    upgradedRuntime.composer.isAttachmentPastePromptAttachmentCandidate = true;
    upgradedRuntime.composer.hoverableAttachmentCandidates = [
      {
        id: 'candidate-github',
        url: 'https://github.com/',
        pastedText: 'github.com',
        rangeStart: 0,
        rangeEnd: 10,
      },
    ];

    rerender(<ComposerPanel runtime={upgradedRuntime} />);

    const upgradedLink = screen.getByRole('link', {
      name: 'github.com',
    });

    expect(upgradedLink.getAttribute('href')).toBe('https://github.com/');
    expect(screen.getByText('Aksi')).toBeTruthy();
    expect(screen.getByText('Tempel sebagai')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'URL' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Attachment' })).toBeTruthy();
  });

  it('renders the composer image preview with square corners', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.previewComposerImageAttachment = {
      id: 'attachment-1',
      fileName: 'preview.png',
      previewUrl: 'https://example.com/preview.png',
    } as typeof runtime.composer.previewComposerImageAttachment;
    runtime.composer.isComposerImageExpanded = true;
    runtime.composer.isComposerImageExpandedVisible = true;

    const { container } = render(<ComposerPanel runtime={runtime} />);

    expect(mockImageUploader).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chat-composer-image-preview',
        shape: 'square',
      })
    );

    const previewImage = container.querySelector(
      'img[alt="preview.png"]'
    ) as HTMLImageElement | null;

    expect(previewImage).not.toBeNull();
    expect(previewImage?.className).toContain('object-contain');
    expect(previewImage?.className).not.toContain('rounded');
  });
});
