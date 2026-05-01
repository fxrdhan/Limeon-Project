# ImageCropper Component Documentation

## Overview

`ImageCropper` is a React component for interactively selecting an image crop area inside a fixed-size parent stage. It renders the source image, a crop overlay, rule-of-thirds guides, and 8 resize handles. The selected crop can be exported through an imperative ref as either a `Blob` or an `HTMLCanvasElement`.

The component only owns the crop interaction and canvas export. File validation, upload, modal composition, object URL lifecycle, and persistence are caller responsibilities.

## File Structure

- `index.tsx`: main React component, pointer interaction, image/stage lifecycle, and canvas/blob export.
- `types.ts`: public types for fit mode, aspect ratio, export options, and ref handle.
- `geometry.ts`: pure geometry utilities for image layout, crop bounds, crop rect resizing, and source-pixel coordinate mapping.
- `geometry.test.ts`: unit tests for the important geometry calculations.

## Public API

### Import

```tsx
import ImageCropper, {
  type ImageCropperHandle,
} from '@/components/image-cropper';
```

### Props

```ts
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
```

| Prop              | Type                                               | Default        | Description                                                                                                                           |
| ----------------- | -------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src`             | `string`                                           | required       | Image URL to crop. This can be an object URL, data URL, or remote URL.                                                                |
| `alt`             | `string`                                           | `'Crop'`       | Alternative text for the `<img>` element.                                                                                             |
| `aspectRatio`     | `number \| 'free'`                                 | `1`            | Crop ratio. A number keeps the crop fixed-aspect, for example `1`, `4 / 3`, `16 / 9`, or `3 / 4`. `'free'` enables freeform resizing. |
| `fitMode`         | `'scale-to-fill' \| 'aspect-fit' \| 'aspect-fill'` | `'aspect-fit'` | How the image is rendered inside the stage. See Fit Modes for details.                                                                |
| `initialCoverage` | `number`                                           | `0.92`         | Initial percentage of the crop bounds covered by the crop rect. The value is clamped from `0.1` to `1`.                               |
| `minCropSize`     | `number`                                           | `36`           | Minimum crop size in stage pixels. In fixed-aspect mode, this value is used as the minimum dimension during resize.                   |
| `className`       | `string`                                           | undefined      | Additional class for the root container. Use this for container background, border, radius, or sizing adjustments.                    |
| `imageClassName`  | `string`                                           | undefined      | Additional class for the `<img>` element.                                                                                             |
| `crossOrigin`     | `HTMLImageElement['crossOrigin']`                  | undefined      | Forwarded to `<img>`. Required when exporting canvas data from remote images that support CORS.                                       |

### Types

```ts
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
```

## Fit Modes

`fitMode` controls the visual image size inside the stage before cropping.

| Mode            | Behavior                                                                                                           | Use Case                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `scale-to-fill` | Stretches the image to exactly fill the stage. The source aspect ratio is not preserved.                           | Useful when the preview must fill a fixed box even if the image becomes visually distorted.          |
| `aspect-fit`    | Scales the image so the full image is visible inside the stage. Empty space can appear horizontally or vertically. | Safe default for manual cropping because the user can inspect the full source image.                 |
| `aspect-fill`   | Scales the image until the entire stage is covered. Some image areas can be outside the stage.                     | Useful when the stage must always be filled and cropping should only happen within the visible area. |

Crop bounds are always the intersection between the stage and the rendered image. With `scale-to-fill`, the rendered image is exactly the stage size, so the whole stage is selectable. With `aspect-fill`, image areas outside the stage cannot be selected because the bounds are clipped to the stage.

## Imperative Export

`ImageCropper` uses `forwardRef` and `useImperativeHandle`. Callers must keep a ref typed as `ImageCropperHandle` to export the selected crop.

### `toBlob(options)`

Returns a `Promise<Blob>` for the active crop area.

```ts
const blob = await imageCropperRef.current.toBlob({
  width: 1024,
  height: 1024,
  mimeType: 'image/jpeg',
  quality: 0.9,
});
```

Export options:

- `width`: output canvas width. If `height` is omitted, height is calculated from the crop aspect ratio.
- `height`: output canvas height. If `width` is omitted, width is calculated from the crop aspect ratio.
- `mimeType`: output format passed to `canvas.toBlob`. Defaults to `image/jpeg`.
- `quality`: output quality for lossy formats such as JPEG/WebP. Defaults to `0.9`.

If both `width` and `height` are provided, the output size follows those values directly. The caller is responsible for making sure the requested output dimensions match product requirements.

### `toCanvas(options)`

Returns an `HTMLCanvasElement` synchronously for the active crop area.

```ts
const canvas = imageCropperRef.current.toCanvas({ width: 512 });
```

This method only accepts `width` and `height` because the canvas has not been converted into a file format yet. Use `toBlob` when `mimeType` and `quality` are needed.

### Error Conditions

Export throws when the cropper is not ready:

- the image element is unavailable,
- the image has not loaded or has no natural size,
- the crop rect has not been initialized,
- the rendered image rect is invalid,
- the canvas context is unavailable.

`toBlob` also rejects if the browser fails to create a blob from the canvas.

## Coordinate Model

The component uses two coordinate spaces:

- **Stage coordinates**: pixels relative to the cropper container. All drag, resize, overlay, and bounds calculations happen in this space.
- **Source coordinates**: original image pixels based on `naturalWidth` and `naturalHeight`. These coordinates are used when drawing to canvas.

Mapping flow:

1. `ResizeObserver` reads the container size and stores `stageSize`.
2. The image `onLoad` handler reads `naturalWidth`/`naturalHeight` as `imageSize`.
3. `getRenderedImageRect(stageSize, imageSize, fitMode)` calculates the image position and size in the stage.
4. `getCropBounds(stageSize, renderedImageRect)` limits cropping to the visible image area.
5. `getInitialCropRect(bounds, aspectRatio, initialCoverage)` creates the initial centered crop rect.
6. During export, `getSourceCropRect(cropRect, renderedImageRect, imageSize)` maps the stage crop to source image pixels.
7. Canvas draws that source rect into the output rect `0,0,width,height`.

## Interaction Model

Users can:

- drag inside the crop rect to move the selection,
- drag `n`, `e`, `s`, or `w` handles to resize from one side,
- drag `ne`, `nw`, `se`, or `sw` handles to resize from a corner.

While dragging:

- pointer movement is listened to on `window`, so dragging continues even if the pointer leaves the cropper,
- `document.body.style.cursor` is updated to match the active drag action,
- `document.body.style.userSelect` is set to `none` to prevent text selection,
- body styles are restored when the pointer ends, is cancelled, or the component unmounts.

Mouse dragging only starts from the primary button (`button === 0`). Pointer events also support touch/stylus because the root uses `touch-none`.

## Aspect Ratio Behavior

`aspectRatio` is normalized by `normalizeAspectRatio`:

- finite numbers become fixed ratios,
- very small numbers are clamped to at least `0.01`,
- `'free'` becomes `null` and enables freeform resizing.

In fixed-aspect mode:

- corner resizing keeps the opposite corner as the anchor,
- horizontal resizing keeps the vertical center,
- vertical resizing keeps the horizontal center,
- the crop is always constrained inside the bounds.

In freeform mode:

- width and height can change independently,
- every side is still constrained by the bounds and `minCropSize`.

## Lifecycle and Reset Rules

Crop state resets when `src` changes:

- `imageSize` is set to `null`,
- `cropRect` is set to `null`,
- the internal `cropKeyRef` is cleared.

The crop rect is recreated when the `src`, `fitMode`, or `aspectRatio` combination changes. If the stage size changes while the key stays the same, the previous crop rect is constrained into the new bounds instead of being recreated.

Callers using object URLs must create and revoke those URLs outside the component. `ImageCropper` does not own the URL lifecycle.

## Usage Example

Example that crops an image into a square `1024x1024` file:

```tsx
import { useEffect, useRef, useState } from 'react';
import ImageCropper, {
  type ImageCropperHandle,
} from '@/components/image-cropper';

function ProductImageCropDialog({ file }: { file: File }) {
  const cropperRef = useRef<ImageCropperHandle | null>(null);
  const [previewUrl] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSave = async () => {
    if (!cropperRef.current) return;

    const blob = await cropperRef.current.toBlob({
      width: 1024,
      height: 1024,
      mimeType: file.type || 'image/jpeg',
      quality: 0.9,
    });

    const croppedFile = new File([blob], file.name, {
      type: blob.type,
      lastModified: Date.now(),
    });

    // Upload or store croppedFile in the caller flow.
  };

  return (
    <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
      <ImageCropper
        ref={cropperRef}
        src={previewUrl}
        alt="Crop"
        aspectRatio={1}
        fitMode="aspect-fit"
      />
      <button type="button" onClick={handleSave}>
        Save
      </button>
    </div>
  );
}
```

The current production pattern in item management:

- the caller validates the file first,
- non-square images are routed to the cropper,
- the cropper is opened in a portal modal,
- the result is exported as `1024x1024`,
- the `Blob` is wrapped back into a `File`,
- a local object URL is used for preview before upload.

## Styling Contract

`ImageCropper` fills its parent with `h-full w-full`. The parent must provide an explicit size, for example `aspect-square`, a fixed height, or a flex/grid layout that produces a valid height.

Root default classes:

```txt
relative h-full w-full overflow-hidden bg-slate-100 touch-none select-none
```

The root also has an inline checkerboard background for transparent/empty areas. `className` can add or override some styling through Tailwind cascade, but the checkerboard background currently comes from inline `style`.

The image element is absolutely positioned and uses `max-w-none`, so its visual size is always controlled by the calculated `renderedImageRect`, not by the browser's natural image layout.

## CORS Notes

Canvas export from a remote image can fail if the image server does not allow CORS. For remote URLs:

```tsx
<ImageCropper src={imageUrl} crossOrigin="anonymous" />
```

The source image server still has to send compatible CORS headers. If the canvas becomes tainted, the browser blocks export operations such as `toBlob`.

Object URLs created from local `File` objects do not need `crossOrigin`.

## Testing Scope

Current tests focus on `geometry.ts` because most cropper risk sits in the calculations:

- aspect ratio normalization,
- image layout for each `fitMode`,
- fixed-aspect resizing inside bounds,
- freeform resizing,
- stage crop to source pixel mapping.

For drag or export behavior changes, prefer testing the geometry utilities when the behavior can be expressed as a pure function. Add component tests only when there is a user-facing contract that cannot be guaranteed through `geometry.ts`.

## Implementation Notes

- `ResizeObserver` tracks parent size changes.
- `cropKey` is based on `src`, `fitMode`, and `aspectRatio`; changing any of them recalculates the initial crop.
- Canvas export enables `imageSmoothingEnabled` and `imageSmoothingQuality = 'high'`.
- Default output size follows the source crop size when `width`/`height` are omitted.
- The crop rect is not exposed as a controlled value. If a caller needs to persist crop coordinates, the component needs a new API designed for that use case.
