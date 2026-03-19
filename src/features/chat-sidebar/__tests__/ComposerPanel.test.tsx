import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import ComposerPanel from '../components/ComposerPanel';
import type { ComposerPanelModel } from '../models';

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
  default: () => <div>popup content</div>,
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
    embeddedLinkPastePromptUrl: null,
    hoverableEmbeddedLinkCandidates: [
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
    hoverableEmbeddedLinkUrl: null,
    pendingComposerAttachments: [],
    previewComposerImageAttachment: undefined,
    isComposerImageExpanded: false,
    isComposerImageExpandedVisible: false,
    openImageActionsAttachmentId: null,
    imageActionsMenuPosition: null,
    imageActions: [],
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
    embeddedLinkPastePromptRef: { current: null },
    imageInputRef: { current: null },
    documentInputRef: { current: null },
    audioInputRef: { current: null },
    imageActionsButtonRef: { current: null },
    imageActionsMenuRef: { current: null },
  },
  actions: {
    onMessageChange: vi.fn(),
    onKeyDown: vi.fn(),
    onPaste: vi.fn(),
    onDismissEmbeddedLinkPastePrompt: vi.fn(),
    onOpenEmbeddedLinkPastePrompt: vi.fn(),
    onUseEmbeddedLinkPasteAsUrl: vi.fn(),
    onUseEmbeddedLinkPasteAsEmbed: vi.fn(),
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
    onRemovePendingComposerAttachment: vi.fn(),
    onQueueComposerImage: vi.fn(() => true),
    onCloseComposerDocumentPreview: vi.fn(),
    onOpenDocumentAttachmentInPortal: vi.fn(),
    onToggleImageActionsMenu: vi.fn(),
  },
});

describe('ComposerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each hoverable embedded link as a separate inline anchor', () => {
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

    expect(model.actions.onOpenEmbeddedLinkPastePrompt).toHaveBeenCalledWith(
      model.attachments.hoverableEmbeddedLinkCandidates[0]
    );
  });
});
