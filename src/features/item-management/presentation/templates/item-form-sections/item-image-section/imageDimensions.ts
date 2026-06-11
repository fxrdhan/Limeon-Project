export const getImageDimensions = (file: File) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const fallbackToImage = () => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: image.width, height: image.height });
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Gagal memuat gambar.'));
      };
      image.src = objectUrl;
    };

    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then(bitmap => {
          resolve({ width: bitmap.width, height: bitmap.height });
          if (typeof bitmap.close === 'function') {
            bitmap.close();
          }
        })
        .catch(fallbackToImage);
      return;
    }

    fallbackToImage();
  });
};
