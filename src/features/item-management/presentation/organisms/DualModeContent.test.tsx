import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DualModeContent from './DualModeContent';

const diffTextProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('../molecules', () => ({
  DiffText: (props: Record<string, unknown>) => {
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

describe('DualModeContent', () => {
  beforeEach(() => {
    diffTextProps.length = 0;
  });

  it('returns null when comparison data is missing', () => {
    const { container } = render(
      <DualModeContent compData={null} entityName="Kategori" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders static values when there are no differences', () => {
    render(
      <DualModeContent
        entityName="Kategori"
        compData={{
          leftKode: 'K-1',
          rightKode: 'K-1',
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

    expect(screen.getByText('K-1')).toBeInTheDocument();
    expect(screen.getByText('Nama A')).toBeInTheDocument();
    expect(screen.getByText('Desc A')).toBeInTheDocument();
    expect(diffTextProps).toHaveLength(0);
  });

  it('renders diffs with originalData and supports flip logic', () => {
    const compData = {
      leftKode: 'LEFT-CODE',
      rightKode: 'RIGHT-CODE',
      leftName: 'LEFT-NAME',
      rightName: 'RIGHT-NAME',
      leftDescription: 'LEFT-DESC',
      rightDescription: 'RIGHT-DESC',
      isKodeDifferent: true,
      isNameDifferent: true,
      isDescriptionDifferent: true,
    };

    const { rerender } = render(
      <DualModeContent compData={compData} entityName="Kategori" />
    );

    expect(screen.getAllByTestId('diff-text')).toHaveLength(3);
    expect(diffTextProps[0]).toMatchObject({
      oldText: 'LEFT-CODE',
      newText: 'RIGHT-CODE',
    });
    expect(diffTextProps[1]).toMatchObject({
      oldText: 'LEFT-NAME',
      newText: 'RIGHT-NAME',
    });
    expect(diffTextProps[2]).toMatchObject({
      oldText: 'LEFT-DESC',
      newText: 'RIGHT-DESC',
    });

    diffTextProps.length = 0;

    rerender(
      <DualModeContent
        compData={compData}
        entityName="Produsen"
        isFlipped={true}
        originalData={{
          originalLeftKode: 'OLD-L-CODE',
          originalRightKode: 'OLD-R-CODE',
          originalLeftName: 'OLD-L-NAME',
          originalRightName: 'OLD-R-NAME',
          originalLeftDescription: 'OLD-L-ADDR',
          originalRightDescription: 'OLD-R-ADDR',
        }}
      />
    );

    expect(screen.getByText('Alamat')).toBeInTheDocument();
    expect(diffTextProps[0]).toMatchObject({
      oldText: 'OLD-R-CODE',
      newText: 'OLD-L-CODE',
    });
    expect(diffTextProps[1]).toMatchObject({
      oldText: 'OLD-R-NAME',
      newText: 'OLD-L-NAME',
    });
    expect(diffTextProps[2]).toMatchObject({
      oldText: 'OLD-R-ADDR',
      newText: 'OLD-L-ADDR',
    });
  });
});
