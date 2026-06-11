import { findMessageLinks } from '../message-search';
import { isSupportedAttachmentAssetCandidateUrl } from './assetCandidates';
import type {
  AttachmentComposerLinkMatch,
  ComposerClipboardLinkMatch,
} from './types';
import {
  extractComposerLinkFromHtmlAnchor,
  extractUrlFromHtmlFragment,
  resolveComposerAttachmentUrl,
} from './urlParsing';

const MARKDOWN_IMAGE_PATTERN =
  /^!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/i;
const MARKDOWN_LINK_PATTERN =
  /^\[[^\]]+\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/i;

const extractAttachmentComposerMarkdownLink = (normalizedText: string) => {
  const markdownImageUrl = normalizedText.match(MARKDOWN_IMAGE_PATTERN)?.[1];
  if (markdownImageUrl) {
    const resolvedUrl = resolveComposerAttachmentUrl(markdownImageUrl);
    if (resolvedUrl) {
      return {
        source: 'markdown-attachment' as const,
        url: resolvedUrl,
      };
    }
  }

  const markdownLinkUrl = normalizedText.match(MARKDOWN_LINK_PATTERN)?.[1];
  if (!markdownLinkUrl) return null;

  const resolvedUrl = resolveComposerAttachmentUrl(markdownLinkUrl);
  if (!resolvedUrl || !isSupportedAttachmentAssetCandidateUrl(resolvedUrl)) {
    return null;
  }

  return {
    source: 'markdown-attachment' as const,
    url: resolvedUrl,
  };
};

export const extractAttachmentComposerLinkFromMessageText = (
  rawText: string
): AttachmentComposerLinkMatch | null => {
  const normalizedText = rawText.trim();
  if (!normalizedText) return null;

  const directUrl = resolveComposerAttachmentUrl(normalizedText);
  if (directUrl && isSupportedAttachmentAssetCandidateUrl(directUrl)) {
    return {
      source: 'direct-url',
      url: directUrl,
    };
  }

  const markdownAttachment =
    extractAttachmentComposerMarkdownLink(normalizedText);
  if (markdownAttachment) {
    return markdownAttachment;
  }

  const htmlUrl = extractUrlFromHtmlFragment(normalizedText);
  if (!htmlUrl) return null;

  return {
    source: 'html-attachment',
    url: htmlUrl,
  };
};

export const extractAttachmentComposerLinkFromClipboard = ({
  text,
  html,
}: {
  text: string;
  html: string;
}): AttachmentComposerLinkMatch | null => {
  const htmlUrl = html.trim() ? extractUrlFromHtmlFragment(html) : null;
  if (htmlUrl) {
    return {
      source: 'html-attachment',
      url: htmlUrl,
    };
  }

  return extractAttachmentComposerLinkFromMessageText(text.trim());
};

export const extractComposerLinkFromMessageText = (
  rawText: string
): ComposerClipboardLinkMatch | null => {
  const normalizedText = rawText.trim();
  if (!normalizedText) return null;

  const attachmentLink =
    extractAttachmentComposerLinkFromMessageText(normalizedText);
  if (attachmentLink) {
    return {
      source: 'attachment',
      pastedText: attachmentLink.url,
      url: attachmentLink.url,
    };
  }

  const [messageLink] = findMessageLinks(normalizedText);
  if (
    !messageLink ||
    messageLink.rangeStart !== 0 ||
    messageLink.rangeEnd !== normalizedText.length
  ) {
    return null;
  }

  return {
    source: 'generic',
    pastedText: messageLink.text,
    url: messageLink.href,
  };
};

export const extractComposerLinkFromClipboard = ({
  text,
  html,
}: {
  text: string;
  html: string;
}): ComposerClipboardLinkMatch | null => {
  const attachmentHtmlUrl = html.trim()
    ? extractUrlFromHtmlFragment(html)
    : null;
  if (attachmentHtmlUrl) {
    return {
      source: 'attachment',
      pastedText: attachmentHtmlUrl,
      url: attachmentHtmlUrl,
    };
  }

  const htmlAnchorLink = html.trim()
    ? extractComposerLinkFromHtmlAnchor(html)
    : null;
  if (htmlAnchorLink) {
    const visibleLinkText = htmlAnchorLink.text.trim();
    const parsedVisibleLink =
      visibleLinkText.length > 0
        ? extractComposerLinkFromMessageText(visibleLinkText)
        : null;
    const isAttachmentLink =
      extractAttachmentComposerLinkFromMessageText(htmlAnchorLink.url) !== null;

    return {
      source: isAttachmentLink ? 'attachment' : 'generic',
      pastedText: parsedVisibleLink?.pastedText || htmlAnchorLink.url,
      url: htmlAnchorLink.url,
    };
  }

  return extractComposerLinkFromMessageText(text);
};
