import { fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import DescriptiveTextarea from '.';

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

describe('DescriptiveTextarea', () => {
  const matchesDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'matches'
  );

  beforeEach(() => {
    vi.useFakeTimers();
    const originalMatches = matchesDescriptor?.value as
      | ((selector: string) => boolean)
      | undefined;
    Object.defineProperty(Element.prototype, 'matches', {
      configurable: true,
      value: vi.fn(function (this: Element, selector: string) {
        if (selector === ':focus-visible') {
          return true;
        }

        return originalMatches?.call(this, selector) ?? false;
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (matchesDescriptor) {
      Object.defineProperty(Element.prototype, 'matches', matchesDescriptor);
    } else {
      Reflect.deleteProperty(Element.prototype, 'matches');
    }
  });

  it('cancels pending keyboard-open focus when collapsed before the focus timer runs', () => {
    render(
      <DescriptiveTextarea
        label="Catatan"
        name="notes"
        value=""
        onChange={vi.fn()}
        expandOnClick
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Catatan' });

    fireEvent.focus(toggleButton);
    expect(screen.getByRole('textbox')).toBeInstanceOf(HTMLTextAreaElement);

    fireEvent.click(toggleButton);
    expect(screen.queryByRole('textbox')).toBeNull();

    vi.runOnlyPendingTimers();

    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
