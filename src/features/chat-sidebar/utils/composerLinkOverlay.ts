import { findMessageLinks } from './message-search';
import type { ComposerHoverableAttachmentCandidate } from '../types';

export interface ComposerLinkOverlaySegment {
  candidate: ComposerHoverableAttachmentCandidate | null;
  href: string | null;
  key: string;
  rangeEnd?: number;
  rangeStart?: number;
  text: string;
}

type DocumentWithCaretRange = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

export const buildComposerLinkOverlaySegments = ({
  candidates,
  message,
}: {
  candidates: ComposerHoverableAttachmentCandidate[];
  message: string;
}) => {
  const sortedCandidates = [...candidates].sort(
    (leftCandidate, rightCandidate) =>
      leftCandidate.rangeStart - rightCandidate.rangeStart
  );
  const messageLinks = findMessageLinks(message)
    .filter(
      messageLink =>
        !sortedCandidates.some(
          candidate =>
            messageLink.rangeStart < candidate.rangeEnd &&
            messageLink.rangeEnd > candidate.rangeStart
        )
    )
    .map(messageLink => ({
      candidate: null,
      href: messageLink.href,
      key: `link_${messageLink.rangeStart}_${messageLink.rangeEnd}`,
      rangeEnd: messageLink.rangeEnd,
      rangeStart: messageLink.rangeStart,
      text: messageLink.text,
    }));
  const sortedOverlayLinks = [
    ...sortedCandidates.map(candidate => ({
      candidate,
      href: candidate.url,
      key: `link_${candidate.rangeStart}_${candidate.rangeEnd}`,
      rangeEnd: candidate.rangeEnd,
      rangeStart: candidate.rangeStart,
      text: message.slice(candidate.rangeStart, candidate.rangeEnd),
    })),
    ...messageLinks,
  ].sort(
    (leftLink, rightLink) =>
      leftLink.rangeStart - rightLink.rangeStart ||
      leftLink.rangeEnd - rightLink.rangeEnd
  );

  if (sortedOverlayLinks.length === 0) {
    return [];
  }

  const segments: ComposerLinkOverlaySegment[] = [];
  let currentIndex = 0;

  for (const overlayLink of sortedOverlayLinks) {
    if (overlayLink.rangeEnd <= currentIndex) {
      continue;
    }

    if (overlayLink.rangeStart > currentIndex) {
      segments.push({
        candidate: null,
        href: null,
        key: `text_${currentIndex}_${overlayLink.rangeStart}`,
        text: message.slice(currentIndex, overlayLink.rangeStart),
      });
    }

    segments.push({
      candidate: overlayLink.candidate,
      href: overlayLink.href,
      key: overlayLink.key,
      rangeEnd: overlayLink.rangeEnd,
      rangeStart: overlayLink.rangeStart,
      text: message.slice(overlayLink.rangeStart, overlayLink.rangeEnd),
    });
    currentIndex = overlayLink.rangeEnd;
  }

  if (currentIndex < message.length) {
    segments.push({
      candidate: null,
      href: null,
      key: `text_${currentIndex}_${message.length}`,
      text: message.slice(currentIndex),
    });
  }

  return segments;
};

export const getComposerLinkSelectionOffset = (
  anchorElement: HTMLAnchorElement,
  clientX: number,
  clientY: number
) => {
  if (typeof document === 'undefined') {
    return anchorElement.textContent?.length ?? 0;
  }

  const maxOffset = anchorElement.textContent?.length ?? 0;
  const buildOffsetFromRange = (targetNode: Node, targetOffset: number) => {
    const range = document.createRange();
    range.setStart(anchorElement, 0);
    range.setEnd(targetNode, targetOffset);
    return Math.max(0, Math.min(maxOffset, range.toString().length));
  };

  const caretPosition = document.caretPositionFromPoint?.(clientX, clientY);
  if (caretPosition && anchorElement.contains(caretPosition.offsetNode)) {
    return buildOffsetFromRange(caretPosition.offsetNode, caretPosition.offset);
  }

  const caretRange = (document as DocumentWithCaretRange).caretRangeFromPoint?.(
    clientX,
    clientY
  );
  if (caretRange && anchorElement.contains(caretRange.startContainer)) {
    return buildOffsetFromRange(
      caretRange.startContainer,
      caretRange.startOffset
    );
  }

  return maxOffset;
};
