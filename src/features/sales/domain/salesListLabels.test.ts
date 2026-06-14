import { describe, expect, it } from 'vite-plus/test';
import { buildSalesNoRowsTemplate } from './salesListLabels';

describe('sales list labels', () => {
  it('escapes search text before rendering an AG Grid no-rows template', () => {
    const template = buildSalesNoRowsTemplate(`"><script>alert('x')</script>`);

    expect(template).toContain('&quot;&gt;&lt;script&gt;');
    expect(template).not.toContain('<script>');
  });
});
