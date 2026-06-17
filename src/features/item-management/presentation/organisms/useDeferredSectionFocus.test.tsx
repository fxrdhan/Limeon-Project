import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useDeferredSectionFocus } from './useDeferredSectionFocus';

const buildSection = () => {
  const section = document.createElement('section');
  const content = document.createElement('div');
  const input = document.createElement('input');

  content.setAttribute('data-section-content', 'true');
  content.append(input);
  section.append(content);
  document.body.append(section);

  return { input, section };
};

describe('useDeferredSectionFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('focuses the first section field after the deferred focus timer runs', () => {
    const { input, section } = buildSection();
    const focusSpy = vi.spyOn(input, 'focus');
    const sectionRef = { current: section };
    const { result } = renderHook(() => useDeferredSectionFocus(sectionRef));

    act(() => {
      result.current.scheduleFocusFirstSectionField();
    });

    expect(focusSpy).not.toHaveBeenCalled();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it('cancels pending deferred focus when the owner unmounts', () => {
    const { input, section } = buildSection();
    const focusSpy = vi.spyOn(input, 'focus');
    const sectionRef = { current: section };
    const { result, unmount } = renderHook(() =>
      useDeferredSectionFocus(sectionRef)
    );

    act(() => {
      result.current.scheduleFocusFirstSectionField();
    });

    unmount();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(focusSpy).not.toHaveBeenCalled();
  });
});
