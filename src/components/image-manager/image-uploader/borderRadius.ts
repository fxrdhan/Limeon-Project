import type { ImageUploaderProps } from '@/types';

type ImageUploaderShape = NonNullable<ImageUploaderProps['shape']>;

export const getImageUploaderBorderRadiusClass = (
  shape: ImageUploaderShape
) => {
  switch (shape) {
    case 'rounded':
      return 'rounded-xl';
    case 'rounded-md':
      return 'rounded-lg';
    case 'square':
      return 'rounded-none';
    case 'full':
      return 'rounded-full';
  }
};
