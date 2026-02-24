export const convertImageBlobToPng = async (imageBlob: Blob) => {
  const objectUrl = URL.createObjectURL(imageBlob);

  try {
    const imageElement = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const nextImageElement = new Image();
        nextImageElement.onload = () => resolve(nextImageElement);
        nextImageElement.onerror = () =>
          reject(new Error('Failed to decode image'));
        nextImageElement.src = objectUrl;
      }
    );

    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    context.drawImage(imageElement, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to convert image to PNG'));
        }
      }, 'image/png');
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const getClipboardImagePayload = async (imageBlob: Blob) => {
  const clipboardItemWithSupports = ClipboardItem as typeof ClipboardItem & {
    supports?: (type: string) => boolean;
  };
  const supportsMimeType = (mimeType: string) =>
    typeof clipboardItemWithSupports.supports === 'function'
      ? clipboardItemWithSupports.supports(mimeType)
      : mimeType === 'image/png';

  const sourceMimeType = imageBlob.type || 'image/png';
  if (supportsMimeType(sourceMimeType)) {
    return {
      blob: imageBlob,
      mimeType: sourceMimeType,
    };
  }

  const pngBlob = await convertImageBlobToPng(imageBlob);
  if (!supportsMimeType('image/png')) {
    throw new Error(`Unsupported clipboard image type: ${sourceMimeType}`);
  }

  return {
    blob: pngBlob,
    mimeType: 'image/png',
  };
};
