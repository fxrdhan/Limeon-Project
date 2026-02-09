import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ButtonText from './ButtonText';

describe('ButtonText', () => {
  it('renders placeholder style and truncation by default', () => {
    render(
      <ButtonText
        displayText="Pilih data"
        titleText="Pilih data"
        isPlaceholder={true}
        isExpanded={false}
      />
    );

    const text = screen.getByText('Pilih data');
    expect(text).toHaveClass('truncate', 'text-slate-400');
    expect(text).toHaveAttribute('title', 'Pilih data');
  });

  it('renders expanded non-placeholder style', () => {
    render(
      <ButtonText
        displayText="Paracetamol 500mg"
        titleText="Paracetamol 500mg"
        isPlaceholder={false}
        isExpanded={true}
      />
    );

    const text = screen.getByText('Paracetamol 500mg');
    expect(text).toHaveClass(
      'whitespace-normal',
      'break-words',
      'text-slate-800'
    );
  });
});
