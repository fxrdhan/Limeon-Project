import { useCallback, useEffect, useRef, useState } from 'react';

interface ProgressiveImagePreviewProps {
  alt: string;
  fullSrc: string | null;
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
  stage25Url: string | null;
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
  includeQuarterStage,
  signal,
}: {
  fullSrc: string;
  includeQuarterStage: boolean;
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
      key: 'stage25Url' | 'stage50Url' | 'stage75Url';
      scale: number;
    }> = [];

    if (includeQuarterStage) {
      stageTargets.push({ key: 'stage25Url', scale: 0.25 });
    }

    stageTargets.push(
      { key: 'stage50Url', scale: 0.5 },
      { key: 'stage75Url', scale: 0.75 }
    );

    const nextStages: PreparedProgressiveImageStages = {
      stage25Url: null,
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
  const hasCustomStageSrcs = stageSrcs.some(
    stageSrc => stageSrc.trim().length > 0
  );
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

  useEffect(() => {
    const dimensionSource =
      backdropSrc?.trim() ||
      stageSrcs.find(stageSrc => stageSrc.trim()) ||
      fullSrc?.trim();
    const requestId = activeFrameSizeRequestIdRef.current + 1;

    if (!dimensionSource) {
      setFrameSize(null);
      return;
    }

    if (availableFrameSize.width === 0 || availableFrameSize.height === 0) {
      return;
    }

    activeFrameSizeRequestIdRef.current = requestId;

    void loadDecodedImage(dimensionSource)
      .then(imageElement => {
        if (activeFrameSizeRequestIdRef.current !== requestId) {
          return;
        }

        setFrameSize(
          buildContainedFrameSize({
            availableWidth: availableFrameSize.width,
            availableHeight: availableFrameSize.height,
            sourceWidth: Math.max(
              imageElement.naturalWidth || imageElement.width || 1,
              1
            ),
            sourceHeight: Math.max(
              imageElement.naturalHeight || imageElement.height || 1,
              1
            ),
          })
        );
      })
      .catch(() => {
        if (activeFrameSizeRequestIdRef.current !== requestId) {
          return;
        }

        setFrameSize(null);
      });
  }, [
    availableFrameSize.height,
    availableFrameSize.width,
    backdropSrc,
    fullSrc,
    stageSrcs,
  ]);

  useEffect(() => {
    const normalizedFullSrc = fullSrc?.trim() || null;
    const normalizedBackdropSrc = backdropSrc?.trim() || null;
    const normalizedStageSrcs = stageSrcs
      .map(stageSrc => stageSrc.trim())
      .filter(Boolean);
    const canUseImmediatePreview =
      Boolean(normalizedBackdropSrc) &&
      normalizedBackdropSrc !== normalizedFullSrc;

    if (normalizedStageSrcs.length === 0) {
      return;
    }

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
      ...normalizedStageSrcs,
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
    backdropSrc,
    clearProgressiveStageTimers,
    fullSrc,
    releasePreparedStageObjectUrls,
    stageSrcs,
  ]);

  useEffect(() => {
    const normalizedFullSrc = fullSrc?.trim() || null;
    const normalizedBackdropSrc = backdropSrc?.trim() || null;
    const canUseImmediatePreview =
      Boolean(normalizedBackdropSrc) &&
      normalizedBackdropSrc !== normalizedFullSrc;
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
      includeQuarterStage: !canUseImmediatePreview,
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
            : preparedStages.stage25Url,
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
    backdropSrc,
    clearProgressiveStageTimers,
    fullSrc,
    hasCustomStageSrcs,
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

  const stageImageClassName = `col-start-1 row-start-1 max-h-full max-w-full object-contain ${imageClassName}`;

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
