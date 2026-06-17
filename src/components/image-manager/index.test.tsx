import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, type MouseEventHandler } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import ImageUploader from './index';

interface MockPopupOption {
  label: string;
  action: () => void;
  disabled?: boolean;
}

interface MockImageUploaderPopupPortalProps {
  isVisible: boolean;
  onMouseEnter: MouseEventHandler<HTMLDivElement>;
  onMouseLeave: MouseEventHandler<HTMLDivElement>;
  options: MockPopupOption[];
}

const createDeferred = <T,>() => {
  let rejectPromise: ((reason?: unknown) => void) | null = null;
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    rejectPromise = reject;
    resolvePromise = resolve;
  });

  return {
    promise,
    reject: (reason?: unknown) => {
      rejectPromise?.(reason);
    },
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

vi.mock('./image-uploader/ImageUploaderPopupPortal', () => ({
  default: ({
    isVisible,
    onMouseEnter,
    onMouseLeave,
    options,
  }: MockImageUploaderPopupPortalProps) => (
    <div
      data-testid="image-uploader-popup"
      data-visible={String(isVisible)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {options.map(option => (
        <button
          key={option.label}
          type="button"
          disabled={option.disabled}
          onClick={option.action}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not reveal the popup from a stale open frame after click-close', () => {
    let queuedFrame: FrameRequestCallback | null = null;
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        queuedFrame = callback;
        return 31;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    const view = render(
      <ImageUploader
        id="identity-image"
        onImageUpload={vi.fn()}
        popupTrigger="click"
      >
        <span>Avatar</span>
      </ImageUploader>
    );

    const trigger = screen.getByRole('button', { name: 'Upload image' });

    fireEvent.click(trigger);

    expect(requestAnimationFrameSpy).toHaveBeenCalledOnce();
    expect(screen.getByTestId('image-uploader-popup').dataset.visible).toBe(
      'false'
    );

    fireEvent.click(trigger);

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(31);

    act(() => {
      queuedFrame?.(0);
    });

    expect(screen.getByTestId('image-uploader-popup').dataset.visible).toBe(
      'false'
    );

    view.unmount();
  });

  it('does not expose a disabled uploader as an interactive button', () => {
    render(
      <ImageUploader id="identity-image" disabled onImageUpload={vi.fn()}>
        <span>Avatar</span>
      </ImageUploader>
    );

    const input = screen.getByLabelText('Upload image file');

    expect(screen.queryByRole('button')).toBeNull();
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  it('does not surface a stale upload error after unmount', async () => {
    const upload = createDeferred<void>();
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const view = render(
      <ImageUploader id="identity-image" onImageUpload={() => upload.promise}>
        <span>Avatar</span>
      </ImageUploader>
    );

    const input = screen.getByLabelText('Upload image file');
    fireEvent.change(input, {
      target: {
        files: [new File(['avatar'], 'avatar.png', { type: 'image/png' })],
      },
    });

    expect(screen.queryByRole('button')).toBeNull();
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement).disabled).toBe(true);

    view.unmount();

    await act(async () => {
      upload.reject(new Error('Upload failed'));
      await upload.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('restores upload interaction after StrictMode effect replay', async () => {
    const upload = createDeferred<void>();

    render(
      <StrictMode>
        <ImageUploader id="identity-image" onImageUpload={() => upload.promise}>
          <span>Avatar</span>
        </ImageUploader>
      </StrictMode>
    );

    const input = screen.getByLabelText('Upload image file');
    expect(input).toBeInstanceOf(HTMLInputElement);

    fireEvent.change(input, {
      target: {
        files: [new File(['avatar'], 'avatar.png', { type: 'image/png' })],
      },
    });

    expect(screen.queryByRole('button')).toBeNull();
    expect((input as HTMLInputElement).disabled).toBe(true);

    await act(async () => {
      upload.resolve(undefined);
      await upload.promise;
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: 'Upload image' })).toBeTruthy();
    expect((input as HTMLInputElement).disabled).toBe(false);
  });

  it('does not reopen the popup from stale hover after upload finishes', async () => {
    const queuedFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      queuedFrames.set(frameId, callback);
      return frameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(frameId => {
      queuedFrames.delete(frameId);
    });

    const flushQueuedFrames = () => {
      const frames = Array.from(queuedFrames.entries());
      queuedFrames.clear();

      for (const [frameId, callback] of frames) {
        callback(frameId);
      }
    };

    const upload = createDeferred<void>();

    render(
      <ImageUploader id="identity-image" onImageUpload={() => upload.promise}>
        <span>Avatar</span>
      </ImageUploader>
    );

    const trigger = screen.getByRole('button', { name: 'Upload image' });
    fireEvent.mouseEnter(trigger);

    act(() => {
      flushQueuedFrames();
    });

    expect(screen.getByTestId('image-uploader-popup').dataset.visible).toBe(
      'true'
    );

    fireEvent.change(screen.getByLabelText('Upload image file'), {
      target: {
        files: [new File(['avatar'], 'avatar.png', { type: 'image/png' })],
      },
    });

    expect(screen.getByTestId('image-uploader-popup').dataset.visible).toBe(
      'false'
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByTestId('image-uploader-popup')).toBeNull();

    await act(async () => {
      upload.resolve(undefined);
      await upload.promise;
      await Promise.resolve();
    });

    act(() => {
      flushQueuedFrames();
    });

    expect(screen.queryByTestId('image-uploader-popup')).toBeNull();
  });
});
