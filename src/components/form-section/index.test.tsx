import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FormSection from './index';

describe('FormSection', () => {
  it('renders title, children, and merges custom class names', () => {
    render(
      <FormSection title="Data Item" className="custom-section">
        <div>Section Content</div>
      </FormSection>
    );

    const heading = screen.getByText('Data Item');
    const wrapper = heading.closest('div');

    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Section Content')).toBeInTheDocument();
    expect(wrapper).toHaveClass('border-2', 'custom-section');
  });
});
