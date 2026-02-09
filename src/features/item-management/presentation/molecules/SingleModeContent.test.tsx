import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SingleModeContent from './SingleModeContent';

const diffCharsMock = vi.hoisted(() => vi.fn());
const convertChangesToSegmentsMock = vi.hoisted(() => vi.fn());
const diffTextProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('@/utils/jsdiff', () => ({
  diffChars: diffCharsMock,
  convertChangesToSegments: convertChangesToSegmentsMock,
}));

vi.mock('./DiffText', () => ({
  default: (props: Record<string, unknown>) => {
    diffTextProps.push(props);
    return (
      <div data-testid="diff-text">
        {String(props.oldText)}
        {'->'}
        {String(props.newText)}
      </div>
    );
  },
}));

describe('SingleModeContent', () => {
  beforeEach(() => {
    diffCharsMock.mockReset();
    convertChangesToSegmentsMock.mockReset();
    diffTextProps.length = 0;
    diffCharsMock.mockReturnValue([]);
    convertChangesToSegmentsMock.mockReturnValue([
      { type: 'removed', text: 'x' },
      { type: 'added', text: 'y' },
    ]);
  });

  it('returns null when no comparison data exists', () => {
    const { container } = render(
      <SingleModeContent compData={null} entityName="Kategori" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders plain values when diff flags are false', () => {
    render(
      <SingleModeContent
        entityName="Kategori"
        compData={{
          leftKode: 'A-1',
          rightKode: 'A-1',
          leftName: 'Nama A',
          rightName: 'Nama A',
          leftDescription: 'Desc A',
          rightDescription: 'Desc A',
          isKodeDifferent: false,
          isNameDifferent: false,
          isDescriptionDifferent: false,
        }}
      />
    );

    expect(screen.getByText('A-1')).toBeInTheDocument();
    expect(screen.getByText('Nama A')).toBeInTheDocument();
    expect(screen.getByText('Desc A')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi')).toBeInTheDocument();
    expect(diffTextProps).toHaveLength(0);
  });

  it('renders diff content with purple borders when changes exist', () => {
    render(
      <SingleModeContent
        entityName="Produsen"
        compData={{
          leftKode: 'OLD-CODE',
          rightKode: 'NEW-CODE',
          leftName: 'OLD-NAME',
          rightName: 'NEW-NAME',
          leftDescription: 'OLD-ADDR',
          rightDescription: 'NEW-ADDR',
          isKodeDifferent: true,
          isNameDifferent: true,
          isDescriptionDifferent: true,
        }}
      />
    );

    expect(screen.getByText('Alamat')).toBeInTheDocument();
    expect(screen.getAllByTestId('diff-text')).toHaveLength(3);
    expect(diffTextProps[0]).toMatchObject({
      oldText: 'OLD-CODE',
      newText: 'NEW-CODE',
    });
    expect(diffCharsMock).toHaveBeenCalledWith('OLD-CODE', 'NEW-CODE');

    const highlightedFields = document.querySelectorAll('.border-purple-500');
    expect(highlightedFields.length).toBeGreaterThan(0);
  });

  it('keeps slate border when flagged different but computed segments are unchanged', () => {
    convertChangesToSegmentsMock.mockReturnValue([
      { type: 'unchanged', text: 'tetap' },
    ]);

    render(
      <SingleModeContent
        entityName="Kategori"
        compData={{
          leftKode: 'SAME',
          rightKode: 'SAME',
          leftName: 'SAMA',
          rightName: 'SAMA',
          leftDescription: 'SAMA',
          rightDescription: 'SAMA',
          isKodeDifferent: true,
          isNameDifferent: false,
          isDescriptionDifferent: false,
        }}
      />
    );

    expect(document.querySelector('.border-slate-300')).toBeInTheDocument();
  });
});
