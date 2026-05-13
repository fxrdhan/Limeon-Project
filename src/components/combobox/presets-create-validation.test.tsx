import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PharmaComboboxSelect } from './index';

type EntityItem = { id: string; name: string };

describe('Combobox app preset create action and validation', () => {
  it('covers an entity field with validation and add-new action', () => {
    const onCreate = vi.fn();
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        required
        validation={{ enabled: true, autoHide: false }}
        createAction={{ onCreate, label: 'Tambah kategori' }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih kategori/i });
    expect(trigger.getAttribute('aria-required')).toBe('true');
    fireEvent.blur(trigger, { relatedTarget: document.body });
    fireEvent.click(trigger);
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, {
      target: { value: 'Analgesik' },
    });
    const createButton = screen.getByRole('button', {
      name: /tambah kategori/i,
    });
    expect(searchInput.parentElement?.contains(createButton)).toBe(false);
    expect(screen.getByRole('listbox').contains(createButton)).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('Tidak ada data')).toBeNull();
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledWith('Analgesik');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    const validationDescriptionId = trigger.getAttribute('aria-describedby');
    expect(validationDescriptionId).toBeTruthy();
    expect(
      document.getElementById(validationDescriptionId as string)?.textContent
    ).toBe('Field ini wajib diisi');
  });

  it('shows the default create action in the empty state before typing', () => {
    const onCreate = vi.fn();
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        createAction={{ onCreate }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih kategori/i }));
    const createButton = screen.getByRole('button', {
      name: /tambah data baru/i,
    });

    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledWith(undefined);
  });

  it('enables required validation without explicit validation props', () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'category-a', name: 'Kategori A' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        required
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih kategori/i });
    fireEvent.blur(trigger, { relatedTarget: document.body });

    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    const validationDescriptionId = trigger.getAttribute('aria-describedby');
    expect(validationDescriptionId).toBeTruthy();
    expect(
      document.getElementById(validationDescriptionId as string)?.textContent
    ).toBe('Field ini wajib diisi');
  });

  it('shows preset validation when native required form validation fires', () => {
    render(
      <form>
        <PharmaComboboxSelect<EntityItem>
          name="category_id"
          items={[{ id: 'category-a', name: 'Kategori A' }]}
          value={null}
          onValueChange={() => {}}
          itemToStringLabel={item => item.name}
          itemToStringValue={item => item.id}
          placeholder="Pilih kategori"
          required
        />
      </form>
    );

    const trigger = screen.getByRole('combobox', { name: /pilih kategori/i });
    const validationProxy = document.querySelector<HTMLInputElement>(
      '[data-combobox-required-input]'
    );

    expect(validationProxy?.checkValidity()).toBe(false);
    fireEvent.invalid(validationProxy as HTMLInputElement);

    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(trigger);
  });

  it('lets callers disable the default required validation overlay', () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'category-a', name: 'Kategori A' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        required
        validation={{ enabled: false }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih kategori/i });
    fireEvent.blur(trigger, { relatedTarget: document.body });

    expect(trigger.getAttribute('aria-invalid')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBeNull();
  });

  it('selects the highlighted partial match before create action on Enter', () => {
    const onCreate = vi.fn();
    const onValueChange = vi.fn();
    const medicine = { id: 'amox-250', name: 'Amoxicillin 250' };

    render(
      <PharmaComboboxSelect
        name="medicine_id"
        items={[medicine]}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        createAction={{ onCreate, label: 'Tambah obat' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, { target: { value: 'Amox' } });

    expect(
      screen.getByRole('option', { name: /amoxicillin 250/i })
    ).toBeTruthy();
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(
      medicine,
      expect.objectContaining({ reason: 'item-press' })
    );
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('uses create action from Enter when no option is highlighted', () => {
    const onCreate = vi.fn();
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="medicine_id"
        items={[{ id: 'amox-250', name: 'Amoxicillin 250' }]}
        value={null}
        onValueChange={onValueChange}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        createAction={{ onCreate, label: 'Tambah obat' }}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: /pilih/i }));
    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, { target: { value: 'Analgesik' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onCreate).toHaveBeenCalledWith('Analgesik');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('does not mark required fields invalid while focus stays inside the popup', () => {
    render(
      <PharmaComboboxSelect<EntityItem>
        name="category_id"
        items={[{ id: 'category-a', name: 'Kategori A' }]}
        value={null}
        onValueChange={() => {}}
        itemToStringLabel={item => item.name}
        itemToStringValue={item => item.id}
        placeholder="Pilih kategori"
        required
        validation={{ enabled: true, autoHide: false }}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih kategori/i });
    fireEvent.click(trigger);
    const searchInput = screen.getByPlaceholderText('Cari...');

    fireEvent.blur(trigger, { relatedTarget: searchInput });
    expect(trigger.getAttribute('aria-invalid')).toBeNull();

    fireEvent.blur(searchInput, { relatedTarget: document.body });
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });

  it('lets scalar selects declare a non-null empty sentinel', () => {
    const onValueChange = vi.fn();

    render(
      <PharmaComboboxSelect
        name="status"
        items={['active', 'inactive']}
        value=""
        onValueChange={onValueChange}
        itemToStringLabel={value =>
          value === 'active'
            ? 'Aktif'
            : value === 'inactive'
              ? 'Tidak aktif'
              : ''
        }
        itemToStringValue={value => value}
        placeholder="Pilih status"
        required
        validation={{ enabled: true, autoHide: false }}
        isValueEmpty={value => value === ''}
      />
    );

    const trigger = screen.getByRole('combobox', { name: /pilih status/i });
    expect(trigger.getAttribute('aria-required')).toBe('true');
    fireEvent.blur(trigger, { relatedTarget: document.body });

    expect(trigger.getAttribute('aria-invalid')).toBe('true');

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /^aktif$/i }));

    expect(onValueChange).toHaveBeenCalledWith(
      'active',
      expect.objectContaining({ reason: 'item-press' })
    );
  });
});
