export const getEntityTableName = (entity: string) => {
  switch (entity.toLowerCase()) {
    case 'kategori':
      return 'item_categories';
    case 'jenis item':
      return 'item_types';
    case 'kemasan':
      return 'item_packages';
    case 'sediaan':
      return 'item_dosages';
    case 'produsen':
      return 'item_manufacturers';
    default:
      return '';
  }
};
