import { describe, expect, it, vi } from 'vite-plus/test';
import {
  compressPdfWithIloveApi,
  createIlovePdfJwt,
} from './actions.ts';

const decodeJwtPayload = (token: string) => {
  const [, payload] = token.split('.');
  return JSON.parse(atob(payload!.replace(/-/g, '+').replace(/_/g, '/')));
};

describe('chat-pdf-compress actions', () => {
  it('creates an iLovePDF JWT with the expected payload', async () => {
    const token = await createIlovePdfJwt({
      publicKey: 'public-key-123',
      secretKey: 'secret-key-456',
    });

    expect(token.split('.')).toHaveLength(3);
    expect(decodeJwtPayload(token)).toEqual(
      expect.objectContaining({
        iss: 'api.ilovepdf.com',
        jti: 'public-key-123',
      })
    );
  });

  it('runs the iLovePDF start/upload/process/download workflow', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            server: 'api70.ilovepdf.com',
            task: 'task-123',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            server_filename: 'server-file-123.pdf',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_filesize: 512,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
          },
        })
      );

    const result = await compressPdfWithIloveApi({
      file: new File(['pdf-data'], 'stok.pdf', {
        type: 'application/pdf',
      }),
      compressionLevel: 'recommended',
      credentials: {
        publicKey: 'public-key-123',
        secretKey: 'secret-key-456',
        region: 'us',
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://api.ilovepdf.com/v1/start/compress/us',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://api70.ilovepdf.com/v1/upload',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'https://api70.ilovepdf.com/v1/process',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      'https://api70.ilovepdf.com/v1/download/task-123',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(result).toEqual({
      compressedBytes: new Uint8Array([1, 2, 3, 4]),
      compressedSize: 512,
      contentType: 'application/pdf',
      fileName: 'stok_compressed.pdf',
      originalSize: 8,
    });
  });

  it('surfaces upstream processing failures', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            server: 'api70.ilovepdf.com',
            task: 'task-123',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            server_filename: 'server-file-123.pdf',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'Vendor process failed',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      );

    await expect(
      compressPdfWithIloveApi({
        file: new File(['pdf-data'], 'stok.pdf', {
          type: 'application/pdf',
        }),
        compressionLevel: 'recommended',
        credentials: {
          publicKey: 'public-key-123',
          secretKey: 'secret-key-456',
          region: 'us',
        },
        fetchImpl,
      })
    ).rejects.toThrow('Vendor process failed');
  });
});
