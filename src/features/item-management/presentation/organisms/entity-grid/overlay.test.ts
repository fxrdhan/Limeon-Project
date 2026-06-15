import { describe, expect, it } from 'vite-plus/test';
import { getEntityGridOverlayNoRowsTemplate } from './overlay';

describe('entity grid overlay templates', () => {
  it('escapes item search text before rendering an AG Grid no-rows template', () => {
    const template = getEntityGridOverlayNoRowsTemplate({
      activeTab: 'items',
      search: `"><script>alert('x')</script>`,
    });

    expect(template).toContain('&quot;&gt;&lt;script&gt;');
    expect(template).not.toContain('<script>');
  });

  it('escapes configurable entity messages and search text', () => {
    const template = getEntityGridOverlayNoRowsTemplate({
      activeTab: 'categories',
      search: '<kategori>',
      entityConfig: {
        entityName: 'Kategori',
        nameColumnHeader: 'Nama',
        searchNoDataMessage: 'Tidak ada <b>kategori</b>',
      },
    });

    expect(template).toBe(
      '<span style="padding: 10px; color: oklch(62.7% 0 0);">Tidak ada &lt;b&gt;kategori&lt;/b&gt; &quot;&lt;kategori&gt;&quot;</span>'
    );
  });
});
