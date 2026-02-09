import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { VersionData } from '../../shared/types/ItemTypes';
import ComparisonHeader from './ComparisonHeader';

const createVersion = (overrides: Partial<VersionData> = {}): VersionData => ({
  id: 'version-1',
  version_number: 1,
  action_type: 'UPDATE',
  changed_at: '2025-01-01T00:00:00.000Z',
  entity_data: {},
  ...overrides,
});

describe('ComparisonHeader', () => {
  it('returns null when comparison data is missing', () => {
    const { container } = render(
      <ComparisonHeader isDualMode={false} compData={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders dual mode with user photo and unknown fallback user', () => {
    render(
      <ComparisonHeader
        isDualMode={true}
        compData={{
          leftVersion: createVersion({
            version_number: 3,
            user_name: 'Alice',
            user_photo: 'https://example.com/alice.jpg',
          }),
          rightVersion: createVersion({
            id: 'version-2',
            version_number: 4,
            user_name: null,
            user_photo: null,
          }),
        }}
      />
    );

    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('v4')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
  });

  it('renders single mode with correct action badge variants', () => {
    const { rerender } = render(
      <ComparisonHeader
        isDualMode={false}
        compData={{
          leftVersion: createVersion({
            action_type: 'INSERT',
            user_name: 'Tester',
            user_photo: null,
          }),
        }}
      />
    );

    expect(screen.getByText('INSERT')).toHaveClass('bg-green-100');
    expect(
      screen.queryByRole('img', { name: 'Tester' })
    ).not.toBeInTheDocument();

    rerender(
      <ComparisonHeader
        isDualMode={false}
        compData={{
          leftVersion: createVersion({
            action_type: 'UPDATE',
            version_number: 2,
            user_name: 'Tester',
            user_photo: null,
          }),
        }}
      />
    );
    expect(screen.getByText('UPDATE')).toHaveClass('bg-blue-100');

    rerender(
      <ComparisonHeader
        isDualMode={false}
        compData={{
          leftVersion: createVersion({
            action_type: 'DELETE',
            version_number: 5,
            user_name: 'Tester',
            user_photo: null,
          }),
        }}
      />
    );
    expect(screen.getByText('DELETE')).toHaveClass('bg-red-100');
  });
});
