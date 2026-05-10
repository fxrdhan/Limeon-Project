import { describe, expect, it } from 'vite-plus/test';
import {
  getKeyboardPinnedHighlightFrame,
  getKeyboardScrollTarget,
} from '../shared/keyboard-pinned-highlight';
import { getComboboxKeyboardHighlightScrollTarget } from './hooks/use-combobox-keyboard-highlight-scroll';

describe('Combobox preset keyboard scroll helpers', () => {
  it('pins the visual highlight to the list edge during keyboard scroll', () => {
    const root = document.createElement('div');
    const listbox = document.createElement('div');
    const optionA = document.createElement('div');
    const optionB = document.createElement('div');

    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 32 },
      scrollHeight: { configurable: true, value: 66 },
      scrollTop: { configurable: true, value: 0 },
    });
    Object.defineProperties(optionA, {
      offsetTop: { configurable: true, value: 0 },
      offsetHeight: { configurable: true, value: 28 },
    });
    Object.defineProperties(optionB, {
      offsetTop: { configurable: true, value: 34 },
      offsetHeight: { configurable: true, value: 28 },
    });
    Object.defineProperty(root, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 100,
        height: 100,
        left: 0,
        right: 220,
        toJSON: () => {},
        top: 0,
        width: 220,
        x: 0,
        y: 0,
      }),
    });
    Object.defineProperty(listbox, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 72,
        height: 32,
        left: 8,
        right: 208,
        toJSON: () => {},
        top: 40,
        width: 200,
        x: 8,
        y: 40,
      }),
    });
    Object.defineProperty(optionA, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 70,
        height: 28,
        left: 8,
        right: 208,
        toJSON: () => {},
        top: 42,
        width: 200,
        x: 8,
        y: 42,
      }),
    });

    const scrollTarget = getKeyboardScrollTarget({
      container: listbox,
      itemCount: 2,
      targetElement: optionB,
      targetIndex: 1,
    });
    expect(scrollTarget).toEqual({ direction: 'down', scrollTop: 34 });
    expect(
      getKeyboardPinnedHighlightFrame({
        container: listbox,
        frameRootElement: root,
        scrollDirection: scrollTarget?.direction ?? 'down',
        sourceElement: optionA,
        targetElement: optionB,
      })
    ).toEqual({
      height: 28,
      left: 8,
      top: 40,
      width: 200,
    });
  });

  it('forces wrapped keyboard scroll to the exact list edges', () => {
    const listbox = document.createElement('div');
    const targetOption = document.createElement('div');

    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 32 },
      scrollHeight: { configurable: true, value: 96 },
      scrollTop: { configurable: true, value: 12 },
    });
    Object.defineProperties(targetOption, {
      offsetTop: { configurable: true, value: 16 },
      offsetHeight: { configurable: true, value: 12 },
    });

    expect(
      getComboboxKeyboardHighlightScrollTarget({
        container: listbox,
        itemCount: 5,
        sourceIndex: 4,
        targetElement: targetOption,
        targetIndex: 0,
      })
    ).toEqual({
      behavior: 'auto',
      direction: 'up',
      scrollTop: 0,
      wrapped: true,
    });
    expect(
      getComboboxKeyboardHighlightScrollTarget({
        container: listbox,
        itemCount: 5,
        sourceIndex: 0,
        targetElement: targetOption,
        targetIndex: 4,
      })
    ).toEqual({
      behavior: 'auto',
      direction: 'down',
      scrollTop: 64,
      wrapped: true,
    });
  });

  it('keeps nearby keyboard edge scroll smooth', () => {
    const listbox = document.createElement('div');
    const targetOption = document.createElement('div');

    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 32 },
      scrollHeight: { configurable: true, value: 96 },
      scrollTop: { configurable: true, value: 0 },
    });
    Object.defineProperties(targetOption, {
      offsetTop: { configurable: true, value: 34 },
      offsetHeight: { configurable: true, value: 28 },
    });

    expect(
      getComboboxKeyboardHighlightScrollTarget({
        container: listbox,
        itemCount: 5,
        sourceIndex: 0,
        targetElement: targetOption,
        targetIndex: 1,
      })
    ).toEqual({
      behavior: 'smooth',
      direction: 'down',
      scrollTop: 34,
      wrapped: false,
    });
  });
});
