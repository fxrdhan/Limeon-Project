import type {
  PreviewableMessage,
  ResolvedPreviewResource,
} from '../../utils/message-preview-assets';

export type ImagePreviewState = {
  backdropUrl: string | null;
  fullUrl: string | null;
  previewName: string;
};

export type ImageGroupPreviewItem = {
  id: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  fullPreviewUrl: string | null;
  previewName: string;
};

export type ImagePreviewIntrinsicDimensions = {
  width: number;
  height: number;
};

export type ResolveImagePreviewResource = (
  message: PreviewableMessage
) => Promise<ResolvedPreviewResource>;
