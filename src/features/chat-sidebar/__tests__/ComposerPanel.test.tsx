import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import ComposerPanel from '../components/ComposerPanel';
import type { ComposerPanelModel } from '../models';

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
  default: ({ children }: { children: React.ReactNode }) => (
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
  default: () => null,
}));

vi.mock('../components/composer/ComposerEditBanner', () => ({
  default: () => null,
}));

const buildComposerModel = (): ComposerPanelModel => ({
  state: {
    message:
      'https://shrtlink.works/bwdrrk3ugm dan https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
    editingMessagePreview: null,
    messageInputHeight: 40,
    isMessageInputMultiline: false,
    isSendSuccessGlowVisible: false,
    isSendDisabled: false,
  },
  attachments: {
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
    hoverableAttachmentUrl: null,
    pendingComposerAttachments: [],
    previewComposerImageAttachment: undefined,
    isComposerImageExpanded: false,
    isComposerImageExpandedVisible: false,
    openImageActionsAttachmentId: null,
    imageActionsMenuPosition: null,
    pdfCompressionMenuPosition: null,
    imageActions: [],
    pdfCompressionLevelActions: [],
  },
  documentPreview: {
    composerDocumentPreviewUrl: null,
    composerDocumentPreviewName: '',
    isComposerDocumentPreviewVisible: false,
  },
  refs: {
    messageInputRef: { current: null },
    composerContainerRef: { current: null },
    attachButtonRef: { current: null },
    attachModalRef: { current: null },
    attachmentPastePromptRef: { current: null },
    imageInputRef: { current: null },
    documentInputRef: { current: null },
    audioInputRef: { current: null },
    imageActionsButtonRef: { current: null },
    imageActionsMenuRef: { current: null },
    pdfCompressionMenuRef: { current: null },
  },
  actions: {
    onMessageChange: vi.fn(),
    onKeyDown: vi.fn(),
    onPaste: vi.fn(),
    onDismissAttachmentPastePrompt: vi.fn(),
    onOpenAttachmentPastePrompt: vi.fn(),
    onOpenComposerLinkPrompt: vi.fn(),
    onEditAttachmentLink: vi.fn(),
    onOpenAttachmentPastePromptLink: vi.fn(),
    onCopyAttachmentPastePromptLink: vi.fn(),
    onShortenAttachmentPastePromptLink: vi.fn(),
    onUseAttachmentPasteAsUrl: vi.fn(),
    onUseAttachmentPasteAsAttachment: vi.fn(),
    onSendMessage: vi.fn(),
    onAttachButtonClick: vi.fn(),
    onAttachImageClick: vi.fn(),
    onAttachDocumentClick: vi.fn(),
    onAttachAudioClick: vi.fn(),
    onImageFileChange: vi.fn(),
    onDocumentFileChange: vi.fn(),
    onAudioFileChange: vi.fn(),
    onCancelEditMessage: vi.fn(),
    onFocusEditingTargetMessage: vi.fn(),
    onOpenComposerImagePreview: vi.fn(),
    onCloseComposerImagePreview: vi.fn(),
    onCancelLoadingComposerAttachment: vi.fn(),
    onRemovePendingComposerAttachment: vi.fn(),
    onQueueComposerImage: vi.fn(() => true),
    onCloseComposerDocumentPreview: vi.fn(),
    onOpenDocumentAttachmentInPortal: vi.fn(),
    onClosePdfCompressionMenu: vi.fn(),
    onToggleImageActionsMenu: vi.fn(),
  },
});

describe('ComposerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes first-item preselection behavior into the composer attachment popup', () => {
    const model = buildComposerModel();
    model.attachments.openImageActionsAttachmentId = 'pending-image-1';
    model.attachments.imageActionsMenuPosition = {
      top: 48,
      left: 64,
    };
    model.attachments.imageActions = [
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

    render(<ComposerPanel model={model} />);

    expect(mockPopupMenuContent).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: model.attachments.imageActions,
        enableArrowNavigation: true,
        autoFocusFirstItem: true,
      })
    );
  });

  it('passes recommended preselection into the pdf compression submenu popup', () => {
    const model = buildComposerModel();
    model.attachments.openImageActionsAttachmentId = 'pending-pdf-1';
    model.attachments.pdfCompressionMenuPosition = {
      top: 72,
      left: 32,
    };
    model.attachments.pdfCompressionLevelActions = [
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

    render(<ComposerPanel model={model} />);

    expect(mockPopupMenuContent).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: model.attachments.pdfCompressionLevelActions,
        enableArrowNavigation: true,
        initialPreselectedIndex: 1,
      })
    );
  });

  it('anchors the composer attach menu above the plus button with bezel alignment and black action labels', () => {
    const model = buildComposerModel();
    model.attachments.isAttachModalOpen = true;

    render(<ComposerPanel model={model} />);

    const dialog = screen.getByRole('dialog', { name: 'Lampirkan file' });

    expect(dialog.parentElement?.className).toContain('left-[-10px]');
    expect(dialog.parentElement?.className).toContain(
      'bottom-[calc(100%+16px)]'
    );
    expect(screen.getByRole('button', { name: 'Gambar' }).className).toContain(
      'text-black'
    );
    expect(screen.getByRole('button', { name: 'Dokumen' }).className).toContain(
      'text-black'
    );
    expect(screen.getByRole('button', { name: 'Audio' }).className).toContain(
      'text-black'
    );
  });

  it('renders each hoverable attachment link as a separate inline anchor', () => {
    const model = buildComposerModel();

    render(<ComposerPanel model={model} />);

    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(2);
    expect(links[0]?.textContent).toBe('https://shrtlink.works/bwdrrk3ugm');
    expect(links[1]?.textContent).toBe(
      'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
    );
    expect(screen.queryByRole('link', { name: ' dan ' })).toBeNull();

    fireEvent.mouseEnter(links[0]);

    expect(model.actions.onOpenAttachmentPastePrompt).toHaveBeenCalledWith(
      model.attachments.hoverableAttachmentCandidates[0]
    );
  });

  it('places the caret at the clicked inline url position', () => {
    const model = buildComposerModel();

    render(<ComposerPanel model={model} />);

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

    expect(model.actions.onEditAttachmentLink).toHaveBeenCalledWith(
      model.attachments.hoverableAttachmentCandidates[0],
      {
        selectionStart: 8,
        selectionEnd: 8,
      }
    );
    expect(model.actions.onEditAttachmentLink).toHaveBeenCalledTimes(1);
  });

  it('renders the attachment link popover with action and paste sections', () => {
    const model = buildComposerModel();
    model.attachments.attachmentPastePromptUrl =
      'https://shrtlink.works/bwdrrk3ugm';
    model.attachments.isAttachmentPastePromptAttachmentCandidate = true;
    model.attachments.isAttachmentPastePromptShortenable = true;

    render(<ComposerPanel model={model} />);

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
    expect(screen.getByRole('button', { name: 'Shorten link' })).toBeTruthy();
    expect(screen.getByText('Tempel sebagai')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'URL' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Attachment' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Buka' }));

    expect(
      model.actions.onOpenAttachmentPastePromptLink
    ).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Salin' }));

    expect(
      model.actions.onCopyAttachmentPastePromptLink
    ).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Shorten link' }));

    expect(
      model.actions.onShortenAttachmentPastePromptLink
    ).toHaveBeenCalledOnce();
  });

  it('renders plain message domains without a protocol as inline links', () => {
    const model = buildComposerModel();
    model.state.message = 'github.com';
    model.attachments.hoverableAttachmentCandidates = [];

    render(<ComposerPanel model={model} />);

    const link = screen.getByRole('link', {
      name: 'github.com',
    });

    expect(link.getAttribute('href')).toBe('https://github.com/');

    fireEvent.mouseEnter(link);

    expect(model.actions.onOpenComposerLinkPrompt).toHaveBeenCalledWith({
      url: 'https://github.com/',
      pastedText: 'github.com',
      rangeStart: 0,
      rangeEnd: 10,
    });
    expect(model.actions.onOpenAttachmentPastePrompt).not.toHaveBeenCalled();
  });

  it('renders the generic link popover without paste-as actions', () => {
    const model = buildComposerModel();
    model.state.message = 'github.com';
    model.attachments.hoverableAttachmentCandidates = [];
    model.attachments.attachmentPastePromptUrl = 'https://github.com/';
    model.attachments.isAttachmentPastePromptShortenable = true;

    render(<ComposerPanel model={model} />);

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
    expect(screen.getByRole('button', { name: 'Shorten link' })).toBeTruthy();
    expect(screen.queryByText('Tempel sebagai')).toBeNull();
    expect(screen.queryByRole('button', { name: 'URL' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Attachment' })).toBeNull();
  });

  it('renders the shorten action for direct chat asset links', () => {
    const model = buildComposerModel();
    model.state.message =
      'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc';
    model.attachments.hoverableAttachmentCandidates = [];
    model.attachments.attachmentPastePromptUrl =
      'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc';
    model.attachments.isAttachmentPastePromptShortenable = true;

    render(<ComposerPanel model={model} />);

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
      model.actions.onShortenAttachmentPastePromptLink
    ).toHaveBeenCalledOnce();
  });

  it('keeps the hovered link node stable when paste-as actions become available', () => {
    const initialModel = buildComposerModel();
    initialModel.state.message = 'github.com';
    initialModel.attachments.hoverableAttachmentCandidates = [];
    initialModel.attachments.attachmentPastePromptUrl = 'https://github.com/';

    const { rerender } = render(<ComposerPanel model={initialModel} />);

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

    const upgradedModel = buildComposerModel();
    upgradedModel.state.message = 'github.com';
    upgradedModel.attachments.attachmentPastePromptUrl = 'https://github.com/';
    upgradedModel.attachments.isAttachmentPastePromptAttachmentCandidate = true;
    upgradedModel.attachments.hoverableAttachmentCandidates = [
      {
        id: 'candidate-github',
        url: 'https://github.com/',
        pastedText: 'github.com',
        rangeStart: 0,
        rangeEnd: 10,
      },
    ];

    rerender(<ComposerPanel model={upgradedModel} />);

    const upgradedLink = screen.getByRole('link', {
      name: 'github.com',
    });

    expect(upgradedLink.getAttribute('href')).toBe('https://github.com/');
    expect(screen.getByText('Aksi')).toBeTruthy();
    expect(screen.getByText('Tempel sebagai')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'URL' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Attachment' })).toBeTruthy();
  });
});
