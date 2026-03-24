export interface ComposerHoverableAttachmentCandidate {
  id: string;
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface ComposerPromptableLink {
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}
