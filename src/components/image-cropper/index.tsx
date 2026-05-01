import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { classNames } from '@/lib/classNames';
import {
  constrainCropRectToBounds,
  getCropBounds,
  getInitialCropRect,
  getNextCropRect,
  getRenderedImageRect,
  getSourceCropRect,
  isUsableRect,
  normalizeAspectRatio,
  type CropperRect,
  type CropperSize,
  type ImageCropperDragAction,
} from './geometry';
import type {
  ImageCropperAspectRatio,
  ImageCropperExportOptions,
  ImageCropperFitMode,
  ImageCropperHandle,
} from './types';

export type {
  ImageCropperAspectRatio,
  ImageCropperExportOptions,
  ImageCropperFitMode,
  ImageCropperHandle,
};

export interface ImageCropperProps {
  src: string;
  alt?: string;
  aspectRatio?: ImageCropperAspectRatio;
  fitMode?: ImageCropperFitMode;
  initialCoverage?: number;
  minCropSize?: number;
  className?: string;
  imageClassName?: string;
  crossOrigin?: React.ImgHTMLAttributes<HTMLImageElement>['crossOrigin'];
}

interface ActiveDrag {
  action: ImageCropperDragAction;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startRect: CropperRect;
  bounds: CropperRect;
  aspectRatio: number | null;
  minCropSize: number;
  previousCursor: string;
  previousUserSelect: string;
}

const CROP_HANDLES: Array<{
  action: ImageCropperDragAction;
  className: string;
}> = [
  {
    action: 'nw',
    className:
      'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  },
  {
    action: 'n',
    className:
      'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  },
  {
    action: 'ne',
    className:
      'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  },
  {
    action: 'e',
    className:
      'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  },
  {
    action: 'se',
    className:
      'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  },
  {
    action: 's',
    className:
      'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  },
  {
    action: 'sw',
    className:
      'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  },
  {
    action: 'w',
    className:
      'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  },
];

const getCanvasOutputSize = (
  sourceRect: CropperRect,
  aspectRatio: number | null,
  options?: Pick<ImageCropperExportOptions, 'width' | 'height'>
) => {
  const requestedWidth =
    typeof options?.width === 'number' && options.width > 0
      ? Math.round(options.width)
      : null;
  const requestedHeight =
    typeof options?.height === 'number' && options.height > 0
      ? Math.round(options.height)
      : null;
  const sourceAspectRatio = sourceRect.width / sourceRect.height;
  const outputAspectRatio = aspectRatio || sourceAspectRatio;

  if (requestedWidth && requestedHeight) {
    return { width: requestedWidth, height: requestedHeight };
  }

  if (requestedWidth) {
    return {
      width: requestedWidth,
      height: Math.max(1, Math.round(requestedWidth / outputAspectRatio)),
    };
  }

  if (requestedHeight) {
    return {
      width: Math.max(1, Math.round(requestedHeight * outputAspectRatio)),
      height: requestedHeight,
    };
  }

  return {
    width: Math.max(1, Math.round(sourceRect.width)),
    height: Math.max(1, Math.round(sourceRect.height)),
  };
};

const getDragCursor = (action: ImageCropperDragAction) => {
  if (action === 'move') return 'move';
  if (action === 'n' || action === 's') return 'ns-resize';
  if (action === 'e' || action === 'w') return 'ew-resize';
  if (action === 'ne' || action === 'sw') return 'nesw-resize';

  return 'nwse-resize';
};

const ImageCropper = forwardRef<ImageCropperHandle, ImageCropperProps>(
  (
    {
      src,
      alt = 'Crop',
      aspectRatio = 1,
      fitMode = 'aspect-fit',
      initialCoverage = 0.92,
      minCropSize = 36,
      className,
      imageClassName,
      crossOrigin,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const activeDragRef = useRef<ActiveDrag | null>(null);
    const cropKeyRef = useRef('');
    const [stageSize, setStageSize] = useState<CropperSize>({
      width: 0,
      height: 0,
    });
    const [imageSize, setImageSize] = useState<CropperSize | null>(null);
    const [cropRect, setCropRect] = useState<CropperRect | null>(null);
    const normalizedAspectRatio = useMemo(
      () => normalizeAspectRatio(aspectRatio),
      [aspectRatio]
    );
    const renderedImageRect = useMemo(
      () =>
        imageSize
          ? getRenderedImageRect(stageSize, imageSize, fitMode)
          : { x: 0, y: 0, width: 0, height: 0 },
      [fitMode, imageSize, stageSize]
    );
    const cropBounds = useMemo(
      () => getCropBounds(stageSize, renderedImageRect),
      [renderedImageRect, stageSize]
    );
    const cropKey = `${src}:${fitMode}:${aspectRatio}`;

    useEffect(() => {
      const containerElement = containerRef.current;
      if (!containerElement) return;

      const updateStageSize = () => {
        const rect = containerElement.getBoundingClientRect();
        setStageSize({
          width: rect.width,
          height: rect.height,
        });
      };
      const resizeObserver = new ResizeObserver(updateStageSize);

      updateStageSize();
      resizeObserver.observe(containerElement);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    useEffect(() => {
      setImageSize(null);
      setCropRect(null);
      cropKeyRef.current = '';
    }, [src]);

    useEffect(() => {
      if (!isUsableRect(cropBounds)) {
        setCropRect(null);
        return;
      }

      setCropRect(previousCropRect => {
        if (!previousCropRect || cropKeyRef.current !== cropKey) {
          cropKeyRef.current = cropKey;
          return getInitialCropRect(
            cropBounds,
            normalizedAspectRatio,
            initialCoverage
          );
        }

        return constrainCropRectToBounds(
          previousCropRect,
          cropBounds,
          normalizedAspectRatio,
          minCropSize
        );
      });
    }, [
      cropBounds,
      cropKey,
      initialCoverage,
      minCropSize,
      normalizedAspectRatio,
    ]);

    useEffect(() => {
      const handlePointerMove = (event: PointerEvent) => {
        const activeDrag = activeDragRef.current;
        if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

        event.preventDefault();
        setCropRect(
          getNextCropRect(
            activeDrag.action,
            activeDrag.startRect,
            event.clientX - activeDrag.startClientX,
            event.clientY - activeDrag.startClientY,
            activeDrag.bounds,
            activeDrag.aspectRatio,
            activeDrag.minCropSize
          )
        );
      };

      const stopPointerDrag = (event: PointerEvent) => {
        const activeDrag = activeDragRef.current;
        if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

        activeDragRef.current = null;
        document.body.style.cursor = activeDrag.previousCursor;
        document.body.style.userSelect = activeDrag.previousUserSelect;
      };

      window.addEventListener('pointermove', handlePointerMove, {
        passive: false,
      });
      window.addEventListener('pointerup', stopPointerDrag);
      window.addEventListener('pointercancel', stopPointerDrag);

      return () => {
        const activeDrag = activeDragRef.current;
        if (activeDrag) {
          document.body.style.cursor = activeDrag.previousCursor;
          document.body.style.userSelect = activeDrag.previousUserSelect;
          activeDragRef.current = null;
        }
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopPointerDrag);
        window.removeEventListener('pointercancel', stopPointerDrag);
      };
    }, []);

    useImperativeHandle(ref, () => {
      const createCanvas = (
        options?: Pick<ImageCropperExportOptions, 'width' | 'height'>
      ) => {
        const imageElement = imageRef.current;
        if (
          !imageElement ||
          !cropRect ||
          !imageSize ||
          !isUsableRect(renderedImageRect)
        ) {
          throw new Error('Image cropper is not ready');
        }

        const sourceRect = getSourceCropRect(
          cropRect,
          renderedImageRect,
          imageSize
        );
        const outputSize = getCanvasOutputSize(
          sourceRect,
          normalizedAspectRatio,
          options
        );
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = outputSize.width;
        canvas.height = outputSize.height;

        if (!context) {
          throw new Error('Image cropper canvas is not available');
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(
          imageElement,
          sourceRect.x,
          sourceRect.y,
          sourceRect.width,
          sourceRect.height,
          0,
          0,
          outputSize.width,
          outputSize.height
        );

        return canvas;
      };

      return {
        toCanvas: createCanvas,
        toBlob(options) {
          const canvas = createCanvas(options);

          return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              blob => {
                if (blob) {
                  resolve(blob);
                  return;
                }

                reject(new Error('Image cropper failed to create a blob'));
              },
              options?.mimeType || 'image/jpeg',
              options?.quality ?? 0.9
            );
          });
        },
      };
    }, [cropRect, imageSize, normalizedAspectRatio, renderedImageRect]);

    const handleImageLoad = useCallback(
      (event: React.SyntheticEvent<HTMLImageElement>) => {
        const imageElement = event.currentTarget;
        const width = imageElement.naturalWidth || imageElement.width;
        const height = imageElement.naturalHeight || imageElement.height;

        setImageSize(width > 0 && height > 0 ? { width, height } : null);
      },
      []
    );

    const startDrag = useCallback(
      (action: ImageCropperDragAction, event: React.PointerEvent) => {
        if (!cropRect || !isUsableRect(cropBounds)) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();
        activeDragRef.current = {
          action,
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startRect: cropRect,
          bounds: cropBounds,
          aspectRatio: normalizedAspectRatio,
          minCropSize,
          previousCursor: document.body.style.cursor,
          previousUserSelect: document.body.style.userSelect,
        };
        document.body.style.cursor = getDragCursor(action);
        document.body.style.userSelect = 'none';
      },
      [cropBounds, cropRect, minCropSize, normalizedAspectRatio]
    );

    const imageStyle = {
      left: `${renderedImageRect.x}px`,
      top: `${renderedImageRect.y}px`,
      width: `${renderedImageRect.width}px`,
      height: `${renderedImageRect.height}px`,
    };
    const cropStyle = cropRect
      ? {
          left: `${cropRect.x}px`,
          top: `${cropRect.y}px`,
          width: `${cropRect.width}px`,
          height: `${cropRect.height}px`,
        }
      : undefined;

    return (
      <div
        ref={containerRef}
        className={classNames(
          'relative h-full w-full overflow-hidden bg-slate-100 touch-none select-none',
          className
        )}
        style={{
          backgroundImage:
            'linear-gradient(45deg, rgba(15,23,42,.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(15,23,42,.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(15,23,42,.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(15,23,42,.08) 75%)',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
          backgroundSize: '16px 16px',
        }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={classNames(
            'pointer-events-none absolute block max-w-none select-none',
            imageClassName
          )}
          style={imageStyle}
          crossOrigin={crossOrigin}
          draggable={false}
          onLoad={handleImageLoad}
        />
        {cropRect && cropStyle ? (
          <div
            className="absolute cursor-move border border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
            style={cropStyle}
            onPointerDown={event => startDrag('move', event)}
          >
            <div className="pointer-events-none absolute left-1/3 top-0 h-full border-l border-dashed border-white/60" />
            <div className="pointer-events-none absolute left-2/3 top-0 h-full border-l border-dashed border-white/60" />
            <div className="pointer-events-none absolute left-0 top-1/3 w-full border-t border-dashed border-white/60" />
            <div className="pointer-events-none absolute left-0 top-2/3 w-full border-t border-dashed border-white/60" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 border border-white bg-slate-950/50 shadow-sm" />
            {CROP_HANDLES.map(handle => (
              <span
                key={handle.action}
                className={classNames(
                  'absolute h-3 w-3 rounded-[2px] border border-white bg-blue-500 shadow-sm touch-none',
                  handle.className
                )}
                onPointerDown={event => startDrag(handle.action, event)}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }
);

ImageCropper.displayName = 'ImageCropper';

export default ImageCropper;
