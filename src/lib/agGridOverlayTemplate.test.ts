import { describe, expect, it } from 'vite-plus/test';
import {
  buildAgGridNoRowsOverlayTemplate,
  escapeAgGridOverlayText,
} from './agGridOverlayTemplate';

describe('AG Grid overlay template helpers', () => {
  it('escapes text before it is embedded in an overlay template', () => {
    expect(escapeAgGridOverlayText(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('builds the no-rows overlay span with escaped text and the default color', () => {
    expect(buildAgGridNoRowsOverlayTemplate('Tidak ada <data>')).toBe(
      '<span style="padding: 10px; color: oklch(55.4% 0.041 257.4);">Tidak ada &lt;data&gt;</span>'
    );
  });
});
