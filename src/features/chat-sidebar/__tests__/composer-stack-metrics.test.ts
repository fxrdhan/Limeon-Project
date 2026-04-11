import { describe, expect, it } from 'vite-plus/test';
import { getComposerVisibleStackMetrics } from '../utils/composer-stack-metrics';

const createRect = (top: number, bottom: number): DOMRect =>
  ({
    top,
    bottom,
    left: 0,
    right: 320,
    width: 320,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('getComposerVisibleStackMetrics', () => {
  it('measures only visible composer children instead of the full layout wrapper', () => {
    const composerContainer = document.createElement('div');
    const tray = document.createElement('div');
    const composerBar = document.createElement('div');

    composerContainer.append(tray, composerBar);
    composerContainer.getBoundingClientRect = () => createRect(320, 700);
    tray.getBoundingClientRect = () => createRect(520, 620);
    composerBar.getBoundingClientRect = () => createRect(619, 680);

    const metrics = getComposerVisibleStackMetrics(composerContainer);

    expect(metrics).toEqual({
      top: 520,
      bottom: 680,
      height: 160,
    });
  });

  it('ignores collapsed children when determining the visible composer stack', () => {
    const composerContainer = document.createElement('div');
    const collapsedTray = document.createElement('div');
    const composerBar = document.createElement('div');

    composerContainer.append(collapsedTray, composerBar);
    collapsedTray.getBoundingClientRect = () => createRect(0, 0);
    composerBar.getBoundingClientRect = () => createRect(640, 700);

    const metrics = getComposerVisibleStackMetrics(composerContainer);

    expect(metrics).toEqual({
      top: 640,
      bottom: 700,
      height: 60,
    });
  });
});
