import type {
  ComposerHoverableAttachmentCandidate,
  ComposerPromptableLink,
} from '../models';

export interface AttachmentPastePromptState {
  id: string;
  isAttachmentCandidate: boolean;
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface PastedAttachmentCandidate {
  id: string;
  pastedText: string;
  url: string;
}

export const buildHoverableAttachmentCandidates = (
  message: string,
  pastedAttachmentCandidates: PastedAttachmentCandidate[]
) => {
  let searchStart = 0;

  return pastedAttachmentCandidates.flatMap(candidate => {
    const rangeStart = message.indexOf(candidate.pastedText, searchStart);
    if (rangeStart < 0) {
      return [];
    }

    const rangeEnd = rangeStart + candidate.pastedText.length;
    searchStart = rangeEnd;

    return [
      {
        id: candidate.id,
        url: candidate.url,
        pastedText: candidate.pastedText,
        rangeStart,
        rangeEnd,
      } satisfies ComposerHoverableAttachmentCandidate,
    ];
  });
};

export const createAttachmentPasteCandidateId = () =>
  `attachment_link_candidate_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export const buildAttachmentPastePrompt = ({
  candidate,
  isAttachmentCandidate,
}: {
  candidate: Pick<
    ComposerHoverableAttachmentCandidate,
    'id' | 'pastedText' | 'rangeStart' | 'rangeEnd' | 'url'
  >;
  isAttachmentCandidate: boolean;
}): AttachmentPastePromptState => ({
  id: candidate.id,
  isAttachmentCandidate,
  url: candidate.url,
  pastedText: candidate.pastedText,
  rangeStart: candidate.rangeStart,
  rangeEnd: candidate.rangeEnd,
});

export const buildComposerLinkPromptState = (
  link: ComposerPromptableLink,
  isAttachmentCandidate: boolean
): AttachmentPastePromptState => ({
  id: `composer_link_prompt_${link.rangeStart}_${link.rangeEnd}`,
  isAttachmentCandidate,
  url: link.url,
  pastedText: link.pastedText,
  rangeStart: link.rangeStart,
  rangeEnd: link.rangeEnd,
});

export const replacePromptRangeWithText = ({
  currentMessage,
  promptState,
  nextText,
}: {
  currentMessage: string;
  promptState: Pick<
    AttachmentPastePromptState,
    'pastedText' | 'rangeEnd' | 'rangeStart'
  >;
  nextText: string;
}) => {
  const pastedSegment = currentMessage.slice(
    promptState.rangeStart,
    promptState.rangeEnd
  );
  if (pastedSegment !== promptState.pastedText) {
    return currentMessage;
  }

  return (
    currentMessage.slice(0, promptState.rangeStart) +
    nextText +
    currentMessage.slice(promptState.rangeEnd)
  );
};
