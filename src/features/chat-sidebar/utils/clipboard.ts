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

  const sourceMimeType = imageBlob.type.toLowerCase() || 'image/png';
  const canWriteSourceMimeType =
    sourceMimeType.startsWith('image/') && supportsMimeType(sourceMimeType);

  if (sourceMimeType === 'image/png') {
    if (!supportsMimeType('image/png')) {
      throw new Error('Unsupported clipboard image type: image/png');
    }

    return {
      blob: imageBlob,
      mimeType: 'image/png',
    };
  }

  if (!supportsMimeType('image/png')) {
    if (canWriteSourceMimeType) {
      return {
        blob: imageBlob,
        mimeType: sourceMimeType,
      };
    }

    throw new Error('Unsupported clipboard image type: image/png');
  }

  try {
    const pngBlob = await convertImageBlobToPng(imageBlob);
    return {
      blob: pngBlob,
      mimeType: 'image/png',
    };
  } catch (error) {
    if (canWriteSourceMimeType) {
      return {
        blob: imageBlob,
        mimeType: sourceMimeType,
      };
    }

    throw error;
  }
};
