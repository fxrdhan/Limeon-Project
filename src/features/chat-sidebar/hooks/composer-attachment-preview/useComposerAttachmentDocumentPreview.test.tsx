import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { PendingComposerAttachment } from '../../types';
import { useComposerAttachmentDocumentPreview } from './useComposerAttachmentDocumentPreview';

const { openDocumentPreviewMock } = vi.hoisted(() => ({
  openDocumentPreviewMock: vi.fn(),
}));

vi.mock('../useDocumentPreviewPortal', () => ({
  useDocumentPreviewPortal: () => ({
    previewUrl: null,
    previewName: '',
    isPreviewVisible: false,
    closeDocumentPreview: vi.fn(),
    openDocumentPreview: openDocumentPreviewMock,
  }),
}));

const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL'
);
const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL'
);
const anchorClickDescriptor = Object.getOwnPropertyDescriptor(
  HTMLAnchorElement.prototype,
  'click'
);

const attachment: PendingComposerAttachment = {
  id: 'attachment-1',
  file: new File(['spreadsheet'], 'stok.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }),
  fileName: 'stok.xlsx',
  fileTypeLabel: 'XLSX',
  fileKind: 'document',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  previewUrl: null,
  pdfCoverUrl: null,
  pdfPageCount: null,
};

describe('useComposerAttachmentDocumentPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (createObjectUrlDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', createObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (revokeObjectUrlDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
    if (anchorClickDescriptor) {
      Object.defineProperty(
        HTMLAnchorElement.prototype,
        'click',
        anchorClickDescriptor
      );
    } else {
      Reflect.deleteProperty(HTMLAnchorElement.prototype, 'click');
    }
  });

  it('downloads a non-pdf attachment when the browser blocks the new tab', () => {
    const onOpenComposerImagePreview = vi.fn();
    const createObjectUrl = vi.fn(() => 'blob:composer-attachment');
    const revokeObjectUrl = vi.fn();
    let clickedDownload = '';
    let clickedHref = '';
    const anchorClick = vi.fn(function (this: HTMLAnchorElement) {
      clickedDownload = this.download;
      clickedHref = this.getAttribute('href') ?? '';
    });

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
      configurable: true,
      value: anchorClick,
    });
    vi.spyOn(window, 'open').mockReturnValue(null);

    const { result } = renderHook(() =>
      useComposerAttachmentDocumentPreview({
        onOpenComposerImagePreview,
      })
    );

    act(() => {
      result.current.openDocumentAttachmentInPortal(attachment);
    });

    expect(window.open).toHaveBeenCalledWith(
      'blob:composer-attachment',
      '_blank',
      'noopener,noreferrer'
    );
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(clickedDownload).toBe('stok.xlsx');
    expect(clickedHref).toBe('blob:composer-attachment');
    expect(document.querySelector('a[href="blob:composer-attachment"]')).toBe(
      null
    );
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:composer-attachment');
    expect(onOpenComposerImagePreview).not.toHaveBeenCalled();
    expect(openDocumentPreviewMock).not.toHaveBeenCalled();
  });
});
