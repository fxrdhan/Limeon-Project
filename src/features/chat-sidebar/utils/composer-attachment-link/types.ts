export interface AttachmentComposerLinkMatch {
  source: 'direct-url' | 'html-attachment' | 'markdown-attachment';
  url: string;
}

export interface AttachmentComposerRemoteFile {
  file: File;
  fileKind: 'image' | 'document';
  sourceUrl: string;
}

export interface ComposerClipboardLinkMatch {
  source: 'attachment' | 'generic';
  pastedText: string;
  url: string;
}
