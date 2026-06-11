export const normalizeComboboxSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('id-ID')
    .trim()
    .replace(/\s+/g, ' ');

export const splitComboboxSearchWords = (value: string) =>
  normalizeComboboxSearchText(value).match(/[a-z0-9]+/g) ?? [];

export const compactComboboxSearchText = (value: string) =>
  splitComboboxSearchWords(value).join('');

export const getComboboxConsonantSkeleton = (value: string) =>
  compactComboboxSearchText(value).replace(/[aiueo]/g, '');

export const getComboboxAcronym = (words: string[]) =>
  words.map(word => word[0] ?? '').join('');
