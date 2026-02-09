import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ButtonIcon from './ButtonIcon';

describe('ButtonIcon', () => {
  it('rotates when open or closing', () => {
    const { container, rerender } = render(
      <ButtonIcon isOpen={false} isClosing={false} />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).not.toHaveClass('rotate-180');

    rerender(<ButtonIcon isOpen={true} isClosing={false} />);
    expect(icon).toHaveClass('rotate-180');

    rerender(<ButtonIcon isOpen={false} isClosing={true} />);
    expect(icon).toHaveClass('rotate-180');
  });
});
