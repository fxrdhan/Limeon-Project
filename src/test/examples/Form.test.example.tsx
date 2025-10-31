/**
 * Example Component Test - Form
 *
 * This example demonstrates testing patterns for forms with validation.
 * Use this as a reference for testing complex user interactions.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';

// Example Form component
interface FormData {
  name: string;
  email: string;
  quantity: number;
}

interface FormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialValues?: Partial<FormData>;
}

// Mock component for example purposes
const ExampleForm: React.FC<FormProps> = ({ onSubmit, initialValues }) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      quantity: Number(formData.get('quantity')),
    };

    // Validation
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = 'Name is required';
    if (!data.email.includes('@')) newErrors.email = 'Invalid email';
    if (data.quantity < 1) newErrors.quantity = 'Quantity must be positive';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          defaultValue={initialValues?.name}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={initialValues?.email}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <span id="email-error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="quantity">Quantity</label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          defaultValue={initialValues?.quantity}
          aria-invalid={!!errors.quantity}
          aria-describedby={errors.quantity ? 'quantity-error' : undefined}
        />
        {errors.quantity && (
          <span id="quantity-error" role="alert">
            {errors.quantity}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};

describe('Form Component', () => {
  let handleSubmit: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    handleSubmit = vi.fn().mockResolvedValue(undefined);
    user = userEvent.setup();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit/i })
      ).toBeInTheDocument();
    });

    it('should render with initial values', () => {
      const initialValues = {
        name: 'John Doe',
        email: 'john@example.com',
        quantity: 10,
      };

      render(
        <ExampleForm onSubmit={handleSubmit} initialValues={initialValues} />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe');
      expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
      expect(screen.getByLabelText(/quantity/i)).toHaveValue(10);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/quantity/i), '5');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Verify submission
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          name: 'Jane Doe',
          email: 'jane@example.com',
          quantity: 5,
        });
      });
    });

    it('should show loading state during submission', async () => {
      handleSubmit.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<ExampleForm onSubmit={handleSubmit} />);

      // Fill and submit
      await user.type(screen.getByLabelText(/name/i), 'John');
      await user.type(screen.getByLabelText(/email/i), 'john@test.com');
      await user.type(screen.getByLabelText(/quantity/i), '1');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Check loading state
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Submit')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should show error when name is empty', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@test.com');
      await user.type(screen.getByLabelText(/quantity/i), '1');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('should show error for invalid email', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      await user.type(screen.getByLabelText(/name/i), 'John');
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.type(screen.getByLabelText(/quantity/i), '1');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    });

    it('should show error for invalid quantity', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      await user.type(screen.getByLabelText(/name/i), 'John');
      await user.type(screen.getByLabelText(/email/i), 'test@test.com');
      await user.type(screen.getByLabelText(/quantity/i), '0');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(
        await screen.findByText('Quantity must be positive')
      ).toBeInTheDocument();
    });

    it('should show multiple errors at once', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      // Submit without filling anything
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
      expect(screen.getByText('Quantity must be positive')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);

      expect(nameInput).toHaveAttribute('id', 'name');
      expect(emailInput).toHaveAttribute('id', 'email');
    });

    it('should mark invalid fields with aria-invalid', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveAttribute(
          'aria-invalid',
          'true'
        );
      });
    });

    it('should link error messages with aria-describedby', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
      });
    });

    it('should announce errors to screen readers', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit/i }));

      const error = await screen.findByRole('alert', {
        name: /name is required/i,
      });
      expect(error).toBeInTheDocument();
    });
  });

  describe('User Experience', () => {
    it('should allow form submission with Enter key', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      await user.type(screen.getByLabelText(/name/i), 'John');
      await user.type(screen.getByLabelText(/email/i), 'john@test.com');
      await user.type(screen.getByLabelText(/quantity/i), '5{Enter}');

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });

    it('should clear errors when correcting input', async () => {
      render(<ExampleForm onSubmit={handleSubmit} />);

      // Submit to trigger errors
      await user.click(screen.getByRole('button', { name: /submit/i }));
      expect(await screen.findByText('Name is required')).toBeInTheDocument();

      // Fill the name field
      await user.type(screen.getByLabelText(/name/i), 'John');

      // Submit again
      await user.type(screen.getByLabelText(/email/i), 'john@test.com');
      await user.type(screen.getByLabelText(/quantity/i), '1');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Error should be gone
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });
});
