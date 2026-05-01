export type ImageCropperFitMode =
  | 'scale-to-fill'
  | 'aspect-fit'
  | 'aspect-fill';

export type ImageCropperAspectRatio = number | 'free';

export interface ImageCropperExportOptions {
  width?: number;
  height?: number;
  mimeType?: string;
  quality?: number;
}

export interface ImageCropperHandle {
  toBlob: (options?: ImageCropperExportOptions) => Promise<Blob>;
  toCanvas: (
    options?: Pick<ImageCropperExportOptions, 'width' | 'height'>
  ) => HTMLCanvasElement;
}
