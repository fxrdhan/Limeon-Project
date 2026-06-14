import { describe, expect, it } from 'vite-plus/test';
import { buildPurchaseNoRowsTemplate } from './purchaseListLabels';

describe('purchase list labels', () => {
  it('escapes search text before rendering an AG Grid no-rows template', () => {
    const template = buildPurchaseNoRowsTemplate(
      `"><script>alert('x')</script>`
    );

    expect(template).toContain('&quot;&gt;&lt;script&gt;');
    expect(template).not.toContain('<script>');
  });
});
