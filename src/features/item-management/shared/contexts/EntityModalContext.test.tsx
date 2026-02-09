import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EntityModalContextValue } from '../types';
import { EntityModalProvider, useEntityModal } from './EntityModalContext';

const createContextValue = (): EntityModalContextValue => ({
  form: {
    code: 'CAT-1',
    name: 'Kategori A',
    description: 'Deskripsi',
    address: '',
    isDirty: false,
    isValid: true,
  },
  ui: {
    isOpen: true,
    isClosing: false,
    isEditMode: false,
    entityName: 'Kategori',
    formattedUpdateAt: '',
    mode: 'add',
  },
  action: {
    isLoading: false,
    isDeleting: false,
  },
  history: {
    entityTable: 'categories',
    entityId: 'cat-1',
    selectedVersion: undefined,
    data: null,
    isLoading: false,
    error: null,
  },
  comparison: {
    isOpen: false,
    isClosing: false,
    selectedVersion: undefined,
    isDualMode: false,
    versionA: undefined,
    versionB: undefined,
    isFlipped: false,
  },
  formActions: {
    setCode: vi.fn(),
    setName: vi.fn(),
    setDescription: vi.fn(),
    setAddress: vi.fn(),
    handleSubmit: vi.fn(async () => undefined),
    handleDelete: vi.fn(),
    resetForm: vi.fn(),
  },
  uiActions: {
    handleClose: vi.fn(),
    handleBackdropClick: vi.fn(),
    setIsClosing: vi.fn(),
    setMode: vi.fn(),
    openHistory: vi.fn(),
    closeHistory: vi.fn(),
    selectVersion: vi.fn(),
    openComparison: vi.fn(),
    closeComparison: vi.fn(),
    openDualComparison: vi.fn(),
    flipVersions: vi.fn(),
    goBack: vi.fn(),
  },
});

describe('EntityModalContext', () => {
  it('provides entity modal context through hook', () => {
    const contextValue = createContextValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EntityModalProvider value={contextValue}>{children}</EntityModalProvider>
    );

    const { result } = renderHook(() => useEntityModal(), { wrapper });

    expect(result.current).toBe(contextValue);
    expect(result.current.ui.entityName).toBe('Kategori');
  });

  it('throws when hook is used outside provider', () => {
    expect(() => renderHook(() => useEntityModal())).toThrowError(
      'useEntityModal must be used within EntityModalProvider'
    );
  });
});
