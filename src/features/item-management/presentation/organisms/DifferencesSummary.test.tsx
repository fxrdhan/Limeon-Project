import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DifferencesSummary from './DifferencesSummary';

vi.mock('motion/react', () => {
  const AnimatePresence = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  const MotionDiv = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );

  return {
    AnimatePresence,
    motion: {
      div: MotionDiv,
    },
  };
});

vi.mock('../molecules', () => ({
  DiffText: ({ oldText, newText }: { oldText: string; newText: string }) => (
    <div>
      <span data-testid="old-text">{oldText}</span>
      <span data-testid="new-text">{newText}</span>
    </div>
  ),
}));

const refs = {
  kodeRef: createRef<HTMLDivElement>(),
  nameRef: createRef<HTMLDivElement>(),
  descriptionRef: createRef<HTMLDivElement>(),
};

describe('DifferencesSummary', () => {
  it('returns null when comparison data is missing', () => {
    const { container } = render(
      <DifferencesSummary
        compData={null}
        originalData={null}
        isDualMode={false}
        entityName="Kategori"
        {...refs}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders no-differences message for single and dual mode', () => {
    const compData = {
      isKodeDifferent: false,
      isNameDifferent: false,
      isDescriptionDifferent: false,
      leftKode: 'A',
      rightKode: 'A',
      leftName: 'Nama',
      rightName: 'Nama',
      leftDescription: 'Desc',
      rightDescription: 'Desc',
    };

    const { rerender } = render(
      <DifferencesSummary
        compData={compData}
        originalData={null}
        isDualMode={false}
        entityName="Kategori"
        {...refs}
      />
    );

    expect(screen.getByText(/Sama dengan data saat ini/)).toBeInTheDocument();

    rerender(
      <DifferencesSummary
        compData={compData}
        originalData={null}
        isDualMode={true}
        entityName="Kategori"
        {...refs}
      />
    );

    expect(screen.getByText(/Kedua versi identik/)).toBeInTheDocument();
  });

  it('renders differences with fallback/original values and dual-mode swap logic', () => {
    const compData = {
      isKodeDifferent: true,
      isNameDifferent: true,
      isDescriptionDifferent: true,
      leftKode: 'LEFT-CODE',
      rightKode: 'RIGHT-CODE',
      leftName: 'LEFT-NAME',
      rightName: 'RIGHT-NAME',
      leftDescription: 'LEFT-DESC',
      rightDescription: 'RIGHT-DESC',
    };

    const { rerender } = render(
      <DifferencesSummary
        compData={compData}
        originalData={null}
        isDualMode={false}
        entityName="Kategori"
        {...refs}
      />
    );

    expect(screen.getByText('Berbeda dari saat ini:')).toBeInTheDocument();
    expect(screen.getByText('Code:')).toBeInTheDocument();
    expect(screen.getByText('Nama:')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi:')).toBeInTheDocument();
    expect(screen.getAllByTestId('old-text')[0]).toHaveTextContent('LEFT-CODE');
    expect(screen.getAllByTestId('new-text')[0]).toHaveTextContent(
      'RIGHT-CODE'
    );

    rerender(
      <DifferencesSummary
        compData={compData}
        originalData={{
          originalLeftKode: 'OLD-LEFT-CODE',
          originalRightKode: 'OLD-RIGHT-CODE',
          originalLeftName: 'OLD-LEFT-NAME',
          originalRightName: 'OLD-RIGHT-NAME',
          originalLeftDescription: 'OLD-LEFT-ADDRESS',
          originalRightDescription: 'OLD-RIGHT-ADDRESS',
        }}
        isDualMode={true}
        entityName="Produsen"
        {...refs}
      />
    );

    expect(
      screen.getByText('Perbedaan antara kedua versi:')
    ).toBeInTheDocument();
    expect(screen.getByText('Alamat:')).toBeInTheDocument();
    expect(screen.getAllByTestId('old-text')[0]).toHaveTextContent(
      'OLD-RIGHT-CODE'
    );
    expect(screen.getAllByTestId('new-text')[0]).toHaveTextContent(
      'OLD-LEFT-CODE'
    );
  });
});
