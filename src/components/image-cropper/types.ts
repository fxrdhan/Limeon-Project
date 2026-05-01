export type ImageCropperFitMode = 'aspect-fit' | 'aspect-fill' | 'scale-to-fit';

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
