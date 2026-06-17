import { describe, expect, it } from 'vite-plus/test';
import { buildZipBlob } from './zip';

describe('buildZipBlob', () => {
  it('creates a zip blob with unique entry names for duplicate files', async () => {
    const zipBlob = await buildZipBlob([
      {
        blob: new Blob(['first']),
        fileName: 'receipt.txt',
      },
      {
        blob: new Blob(['second']),
        fileName: 'receipt.txt',
      },
    ]);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());
    const zipText = new TextDecoder().decode(zipBytes);

    expect(zipBlob.type).toBe('application/zip');
    expect(Array.from(zipBytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(zipText.includes('receipt.txt')).toBe(true);
    expect(zipText.includes('receipt (2).txt')).toBe(true);
  });
});
