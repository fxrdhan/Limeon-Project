import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

interface ProgressiveImagePreviewProps {
  alt: string;
  fullSrc: string | null;
  frameSourceSrc?: string | null;
  backdropSrc?: string | null;
  stageSrcs?: string[];
  allowPointerPassthrough?: boolean;
  className?: string;
  imageClassName?: string;
}

interface PreviewFrameSize {
  height: number;
  width: number;
}

interface PreparedProgressiveImageStages {
  stage50Url: string | null;
  stage75Url: string | null;
  fullUrl: string;
  objectUrls: string[];
}

const PROGRESSIVE_STAGE_TRANSITION_DELAY_MS = 90;
const PROGRESSIVE_STAGE_PRIMARY_MIME_TYPE = 'image/webp';
const PROGRESSIVE_STAGE_FALLBACK_MIME_TYPE = 'image/jpeg';
const PROGRESSIVE_STAGE_OUTPUT_QUALITY = 0.82;
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

const renderCanvasBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
) =>
  new Promise<Blob | null>(resolve => {
    canvas.toBlob(
      blob => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });

const getContainedImageDimensions = (imageElement: HTMLImageElement) => {
  const sourceWidth = Math.max(
    imageElement.naturalWidth || imageElement.width || 1,
    1
  );
  const sourceHeight = Math.max(
    imageElement.naturalHeight || imageElement.height || 1,
    1
  );
  const viewportWidth =
    typeof window === 'undefined'
      ? sourceWidth
      : Math.max(
          1,
          Math.floor(window.innerWidth * PREVIEW_MAX_VIEWPORT_WIDTH_RATIO)
        );
  const viewportHeight =
    typeof window === 'undefined'
      ? sourceHeight
      : Math.max(
          1,
          Math.floor(window.innerHeight * PREVIEW_MAX_VIEWPORT_HEIGHT_RATIO)
        );
  const fitScale = Math.min(
    viewportWidth / sourceWidth,
    viewportHeight / sourceHeight,
    1
  );

  return {
    width: Math.max(1, Math.round(sourceWidth * fitScale)),
    height: Math.max(1, Math.round(sourceHeight * fitScale)),
  };
};

const createResizedStageObjectUrl = async (
  imageElement: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(imageElement, 0, 0, targetWidth, targetHeight);

  let stageBlob = await renderCanvasBlob(
    canvas,
    PROGRESSIVE_STAGE_PRIMARY_MIME_TYPE,
    PROGRESSIVE_STAGE_OUTPUT_QUALITY
  );

  if (!stageBlob) {
    stageBlob = await renderCanvasBlob(
      canvas,
      PROGRESSIVE_STAGE_FALLBACK_MIME_TYPE,
      PROGRESSIVE_STAGE_OUTPUT_QUALITY
    );
  }

  if (!stageBlob) {
    return null;
  }

  const stageObjectUrl = URL.createObjectURL(stageBlob);

  try {
    await loadDecodedImage(stageObjectUrl);
    return stageObjectUrl;
  } catch (error) {
    URL.revokeObjectURL(stageObjectUrl);
    throw error;
  }
};

const prepareProgressiveImageStages = async ({
  fullSrc,
  signal,
}: {
  fullSrc: string;
  signal?: AbortSignal;
}): Promise<PreparedProgressiveImageStages> => {
  const response = await fetch(fullSrc, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error('Failed to fetch progressive image preview');
  }

  const fullBlob = await response.blob();
  const fullObjectUrl = URL.createObjectURL(fullBlob);
  const objectUrls = [fullObjectUrl];

  try {
    const decodedFullImage = await loadDecodedImage(fullObjectUrl);
    const containedDimensions = getContainedImageDimensions(decodedFullImage);
    const stageTargets: Array<{
      key: 'stage50Url' | 'stage75Url';
      scale: number;
    }> = [
      { key: 'stage50Url', scale: 0.5 },
      { key: 'stage75Url', scale: 0.75 },
    ];

    const nextStages: PreparedProgressiveImageStages = {
      stage50Url: null,
      stage75Url: null,
      fullUrl: fullObjectUrl,
      objectUrls,
    };
    const renderedStageSizes = new Set<string>();

    for (const stageTarget of stageTargets) {
      const stageWidth = Math.max(
        1,
        Math.round(containedDimensions.width * stageTarget.scale)
      );
      const stageHeight = Math.max(
        1,
        Math.round(containedDimensions.height * stageTarget.scale)
      );
      const stageSizeKey = `${stageWidth}x${stageHeight}`;

      if (renderedStageSizes.has(stageSizeKey)) {
        continue;
      }

      renderedStageSizes.add(stageSizeKey);

      try {
        const stageObjectUrl = await createResizedStageObjectUrl(
          decodedFullImage,
          stageWidth,
          stageHeight
        );
        if (!stageObjectUrl) {
          continue;
        }

        nextStages[stageTarget.key] = stageObjectUrl;
        objectUrls.push(stageObjectUrl);
      } catch {
        // Keep moving. The next available stage still produces a smoother handoff.
      }
    }

    return nextStages;
  } catch (error) {
    objectUrls.forEach(objectUrl => {
      URL.revokeObjectURL(objectUrl);
    });
    throw error;
  }
};

const ProgressiveImagePreview = ({
  alt,
  fullSrc,
  frameSourceSrc,
  backdropSrc,
  stageSrcs = [],
  allowPointerPassthrough = false,
  className = '',
  imageClassName = '',
}: ProgressiveImagePreviewProps) => {
  const [displayStageUrls, setDisplayStageUrls] = useState<string[]>([]);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [availableFrameSize, setAvailableFrameSize] =
    useState<PreviewFrameSize>({
      width: 0,
      height: 0,
    });
  const [frameSize, setFrameSize] = useState<PreviewFrameSize | null>(null);
  const progressiveStageTimersRef = useRef<number[]>([]);
  const preparedStageObjectUrlsRef = useRef<string[]>([]);
  const activeRequestIdRef = useRef(0);
  const activeFrameSizeRequestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageDimensionsBySourceRef = useRef<
    Map<string, { height: number; width: number }>
  >(new Map());
  const normalizedFullSrc = fullSrc?.trim() || null;
  const normalizedFrameSourceSrc = frameSourceSrc?.trim() || null;
  const normalizedBackdropSrc = backdropSrc?.trim() || null;
  const normalizedStageSrcs = stageSrcs
    .map(stageSrc => stageSrc.trim())
    .filter(Boolean);
  const normalizedStageSrcsKey = normalizedStageSrcs.join('\n');
  const hasCustomStageSrcs = normalizedStageSrcsKey.length > 0;
  const canUseImmediatePreview =
    Boolean(normalizedBackdropSrc) &&
    normalizedBackdropSrc !== normalizedFullSrc;
  const dimensionSource =
    normalizedFrameSourceSrc ||
    normalizedBackdropSrc ||
    normalizedStageSrcs[0] ||
    normalizedFullSrc;
  const activeStageUrl = displayStageUrls[activeStageIndex] ?? null;

  const clearProgressiveStageTimers = useCallback(() => {
    if (progressiveStageTimersRef.current.length === 0) {
      return;
    }

    progressiveStageTimersRef.current.forEach(timerId => {
      window.clearTimeout(timerId);
    });
    progressiveStageTimersRef.current = [];
  }, []);

  const releasePreparedStageObjectUrls = useCallback(() => {
    if (preparedStageObjectUrlsRef.current.length === 0) {
      return;
    }

    preparedStageObjectUrlsRef.current.forEach(objectUrl => {
      URL.revokeObjectURL(objectUrl);
    });
    preparedStageObjectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      activeRequestIdRef.current += 1;
      activeFrameSizeRequestIdRef.current += 1;
      clearProgressiveStageTimers();
      releasePreparedStageObjectUrls();
    };
  }, [clearProgressiveStageTimers, releasePreparedStageObjectUrls]);

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
    setFrameSize(previousFrameSize =>
      previousFrameSize === null ? previousFrameSize : null
    );

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

        setFrameSize(previousFrameSize =>
          previousFrameSize === null ? previousFrameSize : null
        );
      });
  }, [availableFrameSize.height, availableFrameSize.width, dimensionSource]);

  useLayoutEffect(() => {
    if (!hasCustomStageSrcs) {
      return;
    }

    const normalizedStageSrcEntries = normalizedStageSrcsKey
      ? normalizedStageSrcsKey.split('\n')
      : [];
    const requestId = activeRequestIdRef.current + 1;
    const nextDisplayStageUrls =
      canUseImmediatePreview && normalizedBackdropSrc
        ? [normalizedBackdropSrc]
        : [];

    activeRequestIdRef.current = requestId;
    clearProgressiveStageTimers();
    releasePreparedStageObjectUrls();
    setDisplayStageUrls(nextDisplayStageUrls);
    setActiveStageIndex(0);

    const candidateStageUrls = [
      ...normalizedStageSrcEntries,
      normalizedFullSrc,
    ].filter((stageUrl, index, stageUrls): stageUrl is string => {
      if (!stageUrl) {
        return false;
      }

      return stageUrls.indexOf(stageUrl) === index;
    });

    void (async () => {
      for (const [stageIndex, stageUrl] of candidateStageUrls.entries()) {
        await loadDecodedImage(stageUrl);
        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        if (nextDisplayStageUrls.includes(stageUrl)) {
          continue;
        }

        nextDisplayStageUrls.push(stageUrl);
        setDisplayStageUrls([...nextDisplayStageUrls]);
        setActiveStageIndex(nextDisplayStageUrls.length - 1);

        if (stageIndex < candidateStageUrls.length - 1) {
          await new Promise<void>(resolve => {
            const timerId = window.setTimeout(() => {
              resolve();
            }, PROGRESSIVE_STAGE_TRANSITION_DELAY_MS);
            progressiveStageTimersRef.current.push(timerId);
          });
          if (activeRequestIdRef.current !== requestId) {
            return;
          }
        }
      }
    })().catch(() => {
      // Fall through to the current visible stage if a transformed stage fails.
    });
  }, [
    clearProgressiveStageTimers,
    canUseImmediatePreview,
    hasCustomStageSrcs,
    normalizedBackdropSrc,
    normalizedFullSrc,
    normalizedStageSrcsKey,
    releasePreparedStageObjectUrls,
  ]);

  useLayoutEffect(() => {
    const requestId = activeRequestIdRef.current + 1;
    const abortController =
      typeof AbortController === 'undefined' ? null : new AbortController();

    if (hasCustomStageSrcs) {
      return () => {
        abortController?.abort();
      };
    }

    activeRequestIdRef.current = requestId;
    clearProgressiveStageTimers();
    releasePreparedStageObjectUrls();
    setActiveStageIndex(0);
    setDisplayStageUrls(
      canUseImmediatePreview && normalizedBackdropSrc
        ? [normalizedBackdropSrc]
        : []
    );

    if (!normalizedFullSrc) {
      return () => {
        abortController?.abort();
      };
    }

    void prepareProgressiveImageStages({
      fullSrc: normalizedFullSrc,
      signal: abortController?.signal,
    })
      .then(preparedStages => {
        if (activeRequestIdRef.current !== requestId) {
          preparedStages.objectUrls.forEach(objectUrl => {
            URL.revokeObjectURL(objectUrl);
          });
          return;
        }

        preparedStageObjectUrlsRef.current = preparedStages.objectUrls;

        const nextDisplayStageUrls = [
          canUseImmediatePreview && normalizedBackdropSrc
            ? normalizedBackdropSrc
            : preparedStages.stage50Url,
          preparedStages.stage50Url,
          preparedStages.stage75Url,
          preparedStages.fullUrl,
        ].filter((value, index, array): value is string => {
          if (!value) {
            return false;
          }

          return array.indexOf(value) === index;
        });

        setActiveStageIndex(0);
        setDisplayStageUrls(nextDisplayStageUrls);
      })
      .catch(async error => {
        if (
          activeRequestIdRef.current !== requestId ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }

        try {
          await loadDecodedImage(normalizedFullSrc);
        } catch {
          return;
        }

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        setActiveStageIndex(0);
        setDisplayStageUrls(
          [
            canUseImmediatePreview && normalizedBackdropSrc
              ? normalizedBackdropSrc
              : null,
            normalizedFullSrc,
          ].filter((value, index, array): value is string => {
            if (!value) {
              return false;
            }

            return array.indexOf(value) === index;
          })
        );
      });

    return () => {
      abortController?.abort();
    };
  }, [
    clearProgressiveStageTimers,
    hasCustomStageSrcs,
    canUseImmediatePreview,
    normalizedBackdropSrc,
    normalizedFullSrc,
    releasePreparedStageObjectUrls,
  ]);

  useEffect(() => {
    if (hasCustomStageSrcs) {
      return;
    }

    clearProgressiveStageTimers();

    if (displayStageUrls.length <= 1) {
      return;
    }

    displayStageUrls.slice(1).forEach((_, stageIndex) => {
      const timerId = window.setTimeout(
        () => {
          setActiveStageIndex(stageIndex + 1);
        },
        PROGRESSIVE_STAGE_TRANSITION_DELAY_MS * (stageIndex + 1)
      );

      progressiveStageTimersRef.current.push(timerId);
    });

    return () => {
      clearProgressiveStageTimers();
    };
  }, [clearProgressiveStageTimers, displayStageUrls, hasCustomStageSrcs]);

  const stageImageClassName = `col-start-1 row-start-1 h-full w-full max-h-full max-w-full object-contain ${imageClassName}`;

  return (
    <div
      ref={containerRef}
      className={`relative grid place-items-center ${
        allowPointerPassthrough ? 'pointer-events-none' : ''
      } ${className}`}
    >
      {activeStageUrl && frameSize ? (
        <div
          className="grid place-items-center"
          style={{
            width: `${frameSize.width}px`,
            height: `${frameSize.height}px`,
          }}
        >
          <img
            src={activeStageUrl}
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
