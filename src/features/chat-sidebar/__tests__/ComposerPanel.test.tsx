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
  default: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
  default: () => <div data-testid="composer-attachment-preview-list" />,
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
      composerImageExpandedUrl: null,
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
      isComposerAttachmentSelectionMode: false,
      selectedComposerAttachmentIds: [],
      handleToggleImageActionsMenu: vi.fn(),
      handleSelectAllComposerAttachments: vi.fn(),
      handleClearComposerAttachmentSelection: vi.fn(),
      handleDeleteSelectedComposerAttachments: vi.fn(),
      handleToggleComposerAttachmentSelection: vi.fn(),
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

  it('renders the attach popup menu when the composer attach menu is open', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.isAttachModalOpen = true;

    render(<ComposerPanel runtime={runtime} />);

    expect(screen.getByRole('dialog', { name: 'Lampirkan file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gambar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dokumen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Audio' })).toBeTruthy();
  });

  it('renders the composer attachment selection bar when selection mode is active', () => {
    const runtime = buildComposerRuntime();
    runtime.previews.isComposerAttachmentSelectionMode = true;
    runtime.previews.selectedComposerAttachmentIds = ['pending-image-1'];
    runtime.composer.composerAttachmentPreviewItems = [
      {
        id: 'pending-image-1',
        file: new File(['image'], 'foto.png', { type: 'image/png' }),
        fileName: 'foto.png',
        fileTypeLabel: 'PNG',
        fileKind: 'image',
        mimeType: 'image/png',
        previewUrl: 'blob:preview-1',
        pdfCoverUrl: null,
        pdfPageCount: null,
      },
      {
        id: 'pending-doc-1',
        file: new File(['pdf'], 'dokumen.pdf', { type: 'application/pdf' }),
        fileName: 'dokumen.pdf',
        fileTypeLabel: 'PDF',
        fileKind: 'document',
        mimeType: 'application/pdf',
        previewUrl: null,
        pdfCoverUrl: null,
        pdfPageCount: null,
      },
    ];

    render(<ComposerPanel runtime={runtime} />);

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pilih semua' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));

    expect(
      runtime.previews.handleClearComposerAttachmentSelection
    ).toHaveBeenCalledOnce();
    expect(
      runtime.previews.handleSelectAllComposerAttachments
    ).toHaveBeenCalledOnce();
    expect(
      runtime.previews.handleDeleteSelectedComposerAttachments
    ).toHaveBeenCalledOnce();
  });

  it('hides the delete action when no composer attachments are selected', () => {
    const runtime = buildComposerRuntime();
    runtime.previews.isComposerAttachmentSelectionMode = true;
    runtime.composer.composerAttachmentPreviewItems = [
      {
        id: 'pending-image-1',
        file: new File(['image'], 'foto.png', { type: 'image/png' }),
        fileName: 'foto.png',
        fileTypeLabel: 'PNG',
        fileKind: 'image',
        mimeType: 'image/png',
        previewUrl: 'blob:preview-1',
        pdfCoverUrl: null,
        pdfPageCount: null,
      },
    ];

    render(<ComposerPanel runtime={runtime} />);

    expect(screen.getByRole('button', { name: 'Batal' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Hapus' })).toBeNull();
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

    expect(screen.queryByRole('button', { name: 'Shorten link' })).toBeNull();

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

    fireEvent.click(screen.getByRole('button', { name: 'URL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Attachment' }));

    expect(
      upgradedRuntime.composer.handleUseAttachmentPasteAsUrl
    ).toHaveBeenCalledOnce();
    expect(
      upgradedRuntime.composer.handleUseAttachmentPasteAsAttachment
    ).toHaveBeenCalledOnce();
  });

  it('caps the composer panel height to half of the viewport', () => {
    const runtime = buildComposerRuntime();
    const { container } = render(<ComposerPanel runtime={runtime} />);

    const composerRoot = container.querySelector('div[class*="top-1/2"]');

    expect(composerRoot).toBeTruthy();
  });

  it('caps the attachment tray height and keeps it separate from the composer bar', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.composerAttachmentPreviewItems = [
      {
        id: 'pending-image-1',
        file: new File(['image'], 'foto.png', { type: 'image/png' }),
        fileName: 'foto.png',
        fileTypeLabel: 'PNG',
        fileKind: 'image',
        mimeType: 'image/png',
        previewUrl: 'blob:preview-1',
        pdfCoverUrl: null,
        pdfPageCount: null,
      },
    ];

    const { container } = render(<ComposerPanel runtime={runtime} />);

    const tray = container.querySelector(
      'div[class*="grid-rows-"][class*="overflow-hidden"]'
    );

    expect(tray).toBeTruthy();
    expect(tray?.className).toContain('shrink-0');
    expect(tray?.className).not.toContain('flex-1');
    expect(tray?.className).not.toContain('max-h-[');
    expect(screen.getByTestId('composer-attachment-preview-list')).toBeTruthy();
  });

  it('measures only the visible composer stack for viewport spacing', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.composerAttachmentPreviewItems = [
      {
        id: 'pending-image-1',
        file: new File(['image'], 'foto.png', { type: 'image/png' }),
        fileName: 'foto.png',
        fileTypeLabel: 'PNG',
        fileKind: 'image',
        mimeType: 'image/png',
        previewUrl: 'blob:preview-1',
        pdfCoverUrl: null,
        pdfPageCount: null,
      },
    ];

    render(<ComposerPanel runtime={runtime} />);

    const composerContainer = runtime.refs.composerContainerRef.current;

    expect(composerContainer).toBeTruthy();
    expect(composerContainer?.className).toContain('flex-1');
    expect(composerContainer?.className).toContain('pointer-events-none');
    expect(composerContainer).toContain(
      screen.getByTestId('composer-attachment-preview-list')
    );
    expect(composerContainer).toContain(
      screen.getByRole('button', { name: 'Kirim pesan' })
    );
    expect(
      composerContainer?.querySelector('div.pointer-events-auto.shrink-0')
    ).toBeTruthy();
  });

  it('keeps the empty composer overlay transparent to pointer events', () => {
    const runtime = buildComposerRuntime();
    const { container } = render(<ComposerPanel runtime={runtime} />);

    const composerOverlay = container.querySelector('div[class*="top-1/2"]');

    expect(composerOverlay?.className).toContain('pointer-events-none');
  });

  it('prefers the original attachment image when the composer preview is expanded', () => {
    const runtime = buildComposerRuntime();
    runtime.composer.previewComposerImageAttachment = {
      id: 'pending-image-1',
      file: new File(['image'], 'foto.png', { type: 'image/png' }),
      fileName: 'foto.png',
      fileTypeLabel: 'PNG',
      fileKind: 'image',
      mimeType: 'image/png',
      previewUrl: 'blob:thumbnail-preview',
      pdfCoverUrl: null,
      pdfPageCount: null,
    };
    runtime.composer.composerImageExpandedUrl = 'blob:full-image-preview';
    runtime.composer.isComposerImageExpanded = true;
    runtime.composer.isComposerImageExpandedVisible = true;

    render(<ComposerPanel runtime={runtime} />);

    expect(screen.getByAltText('foto.png').getAttribute('src')).toBe(
      'blob:full-image-preview'
    );
  });
});
