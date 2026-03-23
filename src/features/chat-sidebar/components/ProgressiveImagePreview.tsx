import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ProgressiveImagePreviewProps {
  alt: string;
  fullSrc: string | null;
  frameSourceSrc?: string | null;
  backdropSrc?: string | null;
  allowPointerPassthrough?: boolean;
  className?: string;
  imageClassName?: string;
}

interface PreviewFrameSize {
  height: number;
  width: number;
}

const PREVIEW_MAX_VIEWPORT_WIDTH_RATIO = 0.92;
const PREVIEW_MAX_VIEWPORT_HEIGHT_RATIO = 0.92;

const loadDecodedImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const imageElement = new Image();
    imageElement.decoding = 'async';

    imageElement.onload = () => {
      const finalizeResolve = () => {
        resolve(imageElement);
      };

      if (typeof imageElement.decode === 'function') {
        imageElement
          .decode()
          .catch(() => undefined)
          .finally(finalizeResolve);
        return;
      }

      finalizeResolve();
    };

    imageElement.onerror = () => {
      reject(new Error('Failed to decode progressive image preview'));
    };

    imageElement.src = src;
  });

const buildContainedFrameSize = ({
  availableHeight,
  availableWidth,
  sourceHeight,
  sourceWidth,
}: {
  availableHeight: number;
  availableWidth: number;
  sourceHeight: number;
  sourceWidth: number;
}): PreviewFrameSize | null => {
  if (
    availableWidth <= 0 ||
    availableHeight <= 0 ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return null;
  }

  const fitScale = Math.min(
    availableWidth / sourceWidth,
    availableHeight / sourceHeight
  );

  return {
    width: Math.max(1, Math.round(sourceWidth * fitScale)),
    height: Math.max(1, Math.round(sourceHeight * fitScale)),
  };
};

const resolveFallbackFrameSize = () => ({
  width: Math.max(
    0,
    Math.round(window.innerWidth * PREVIEW_MAX_VIEWPORT_WIDTH_RATIO)
  ),
  height: Math.max(
    0,
    Math.round(window.innerHeight * PREVIEW_MAX_VIEWPORT_HEIGHT_RATIO)
  ),
});

const areFrameSizesEqual = (
  leftFrameSize: PreviewFrameSize | null,
  rightFrameSize: PreviewFrameSize | null
) =>
  leftFrameSize?.width === rightFrameSize?.width &&
  leftFrameSize?.height === rightFrameSize?.height;

const ProgressiveImagePreview = ({
  alt,
  fullSrc,
  frameSourceSrc,
  backdropSrc,
  allowPointerPassthrough = false,
  className = '',
  imageClassName = '',
}: ProgressiveImagePreviewProps) => {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [availableFrameSize, setAvailableFrameSize] =
    useState<PreviewFrameSize>({
      width: 0,
      height: 0,
    });
  const [frameSize, setFrameSize] = useState<PreviewFrameSize | null>(null);
  const activeDisplayRequestIdRef = useRef(0);
  const activeFrameSizeRequestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageDimensionsBySourceRef = useRef<
    Map<string, { height: number; width: number }>
  >(new Map());
  const normalizedFullSrc = fullSrc?.trim() || null;
  const normalizedFrameSourceSrc = frameSourceSrc?.trim() || null;
  const normalizedBackdropSrc = backdropSrc?.trim() || null;
  const immediatePreviewSrc = normalizedBackdropSrc;
  const dimensionSource =
    normalizedFrameSourceSrc || immediatePreviewSrc || normalizedFullSrc;

  useEffect(() => {
    return () => {
      activeDisplayRequestIdRef.current += 1;
      activeFrameSizeRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      const fallbackRect = containerElement.getBoundingClientRect();
      setAvailableFrameSize({
        width: Math.max(
          0,
          Math.round(fallbackRect.width || resolveFallbackFrameSize().width)
        ),
        height: Math.max(
          0,
          Math.round(fallbackRect.height || resolveFallbackFrameSize().height)
        ),
      });
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      const nextRect = entries[0]?.contentRect;
      if (!nextRect) {
        return;
      }

      const fallbackFrameSize = resolveFallbackFrameSize();

      setAvailableFrameSize({
        width: Math.max(
          0,
          Math.round(nextRect.width || fallbackFrameSize.width)
        ),
        height: Math.max(
          0,
          Math.round(nextRect.height || fallbackFrameSize.height)
        ),
      });
    });

    resizeObserver.observe(containerElement);
    const initialRect = containerElement.getBoundingClientRect();
    const fallbackFrameSize = resolveFallbackFrameSize();
    setAvailableFrameSize({
      width: Math.max(
        0,
        Math.round(initialRect.width || fallbackFrameSize.width)
      ),
      height: Math.max(
        0,
        Math.round(initialRect.height || fallbackFrameSize.height)
      ),
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!dimensionSource) {
      setFrameSize(previousFrameSize =>
        previousFrameSize === null ? previousFrameSize : null
      );
      return;
    }

    if (availableFrameSize.width === 0 || availableFrameSize.height === 0) {
      return;
    }

    const cachedDimensions =
      imageDimensionsBySourceRef.current.get(dimensionSource) ?? null;
    if (cachedDimensions) {
      const nextFrameSize = buildContainedFrameSize({
        availableWidth: availableFrameSize.width,
        availableHeight: availableFrameSize.height,
        sourceWidth: cachedDimensions.width,
        sourceHeight: cachedDimensions.height,
      });
      setFrameSize(previousFrameSize =>
        areFrameSizesEqual(previousFrameSize, nextFrameSize)
          ? previousFrameSize
          : nextFrameSize
      );
      return;
    }

    const requestId = activeFrameSizeRequestIdRef.current + 1;
    activeFrameSizeRequestIdRef.current = requestId;

    void loadDecodedImage(dimensionSource)
      .then(imageElement => {
        if (activeFrameSizeRequestIdRef.current !== requestId) {
          return;
        }

        const decodedDimensions = {
          width: Math.max(
            imageElement.naturalWidth || imageElement.width || 1,
            1
          ),
          height: Math.max(
            imageElement.naturalHeight || imageElement.height || 1,
            1
          ),
        };
        imageDimensionsBySourceRef.current.set(
          dimensionSource,
          decodedDimensions
        );
        const nextFrameSize = buildContainedFrameSize({
          availableWidth: availableFrameSize.width,
          availableHeight: availableFrameSize.height,
          sourceWidth: decodedDimensions.width,
          sourceHeight: decodedDimensions.height,
        });
        setFrameSize(previousFrameSize =>
          areFrameSizesEqual(previousFrameSize, nextFrameSize)
            ? previousFrameSize
            : nextFrameSize
        );
      })
      .catch(() => {
        if (activeFrameSizeRequestIdRef.current !== requestId) {
          return;
        }
      });
  }, [availableFrameSize.height, availableFrameSize.width, dimensionSource]);

  useEffect(() => {
    const requestId = activeDisplayRequestIdRef.current + 1;
    activeDisplayRequestIdRef.current = requestId;
    setDisplaySrc(immediatePreviewSrc);

    if (!normalizedFullSrc || normalizedFullSrc === immediatePreviewSrc) {
      return;
    }

    void loadDecodedImage(normalizedFullSrc)
      .then(() => {
        if (activeDisplayRequestIdRef.current !== requestId) {
          return;
        }

        setDisplaySrc(normalizedFullSrc);
      })
      .catch(() => {
        if (activeDisplayRequestIdRef.current !== requestId) {
          return;
        }
      });
  }, [immediatePreviewSrc, normalizedFullSrc]);

  const stageImageClassName = `col-start-1 row-start-1 h-full w-full max-h-full max-w-full object-contain ${imageClassName}`;

  return (
    <div
      ref={containerRef}
      className={`relative grid place-items-center ${
        allowPointerPassthrough ? 'pointer-events-none' : ''
      } ${className}`}
    >
      {displaySrc && frameSize ? (
        <div
          className="grid place-items-center"
          style={{
            width: `${frameSize.width}px`,
            height: `${frameSize.height}px`,
          }}
        >
          <img
            src={displaySrc}
            alt={alt}
            className={`${stageImageClassName} ${
              allowPointerPassthrough ? 'pointer-events-auto' : ''
            }`}
            onClick={event => {
              event.stopPropagation();
            }}
            draggable={false}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ProgressiveImagePreview;
