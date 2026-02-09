import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FormField from './index';

describe('FormField', () => {
  it('renders label, children, and required marker', () => {
    render(
      <FormField label="Nama" required className="field-wrapper">
        <input aria-label="nama-input" />
      </FormField>
    );

    expect(screen.getByText('Nama')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByLabelText('nama-input')).toBeInTheDocument();
    expect(screen.getByText('Nama').parentElement).toHaveClass('field-wrapper');
  });

  it('hides required marker when not required', () => {
    render(
      <FormField label="Alamat">
        <textarea aria-label="alamat-input" />
      </FormField>
    );

    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });
});
