import type { ChatPdfCompressionLevel } from '../../../shared/chatFunctionContracts.ts';

const ILOVE_API_HOST = 'api.ilovepdf.com';
const ILOVE_API_BASE_URL = `https://${ILOVE_API_HOST}/v1`;
const ILOVE_API_JWT_TIME_DELAY_SECONDS = 5;

export interface IlovePdfCredentials {
  publicKey: string;
  secretKey: string;
  region: string;
}

export interface ChatPdfCompressResult {
  compressedBytes: Uint8Array;
  compressedSize: number;
  contentType: string;
  fileName: string;
  originalSize: number;
}

const normalizeFileName = (value?: string | null) => {
  const trimmedValue = value?.trim() || '';
  if (!trimmedValue) {
    return 'document.pdf';
  }

  return trimmedValue.toLowerCase().endsWith('.pdf')
    ? trimmedValue
    : `${trimmedValue}.pdf`;
};

const buildCompressedFileName = (value: string) => {
  const normalizedValue = normalizeFileName(value);
  const pdfSuffix = '.pdf';
  const fileNameWithoutExtension = normalizedValue.slice(0, -pdfSuffix.length);

  if (fileNameWithoutExtension.endsWith('_compressed')) {
    return normalizedValue;
  }

  return `${fileNameWithoutExtension}_compressed${pdfSuffix}`;
};

const encodeBase64Url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const encodeJsonBase64Url = (value: Record<string, unknown>) =>
  encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));

const readResponseMessage = async (
  response: Response,
  fallbackMessage: string
) => {
  const responseText = await response.text();
  if (!responseText) {
    return fallbackMessage;
  }

  try {
    const payload = JSON.parse(responseText) as Record<string, unknown>;
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }
  } catch {
    // Ignore malformed JSON error responses and fall back to text.
  }

  return responseText.trim() || fallbackMessage;
};

export const createIlovePdfJwt = async ({
  publicKey,
  secretKey,
}: Pick<IlovePdfCredentials, 'publicKey' | 'secretKey'>) => {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const payload = {
    jti: publicKey,
    iss: ILOVE_API_HOST,
    iat: nowInSeconds - ILOVE_API_JWT_TIME_DELAY_SECONDS,
  };
  const encodedHeader = encodeJsonBase64Url(header);
  const encodedPayload = encodeJsonBase64Url(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signingKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      signingKey,
      new TextEncoder().encode(signingInput)
    )
  );

  return `${signingInput}.${encodeBase64Url(signature)}`;
};

export const compressPdfWithIloveApi = async ({
  file,
  compressionLevel,
  credentials,
  fetchImpl = fetch,
}: {
  file: File;
  compressionLevel: ChatPdfCompressionLevel;
  credentials: IlovePdfCredentials;
  fetchImpl?: typeof fetch;
}): Promise<ChatPdfCompressResult> => {
  const token = await createIlovePdfJwt(credentials);
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };
  const normalizedFileName = normalizeFileName(file.name);
  const compressedFileName = buildCompressedFileName(normalizedFileName);

  const startResponse = await fetchImpl(
    `${ILOVE_API_BASE_URL}/start/compress/${credentials.region}`,
    {
      method: 'GET',
      headers: authHeaders,
    }
  );
  if (!startResponse.ok) {
    throw new Error(
      await readResponseMessage(
        startResponse,
        'Failed to start PDF compression task'
      )
    );
  }

  const startPayload = (await startResponse.json()) as {
    server?: string;
    task?: string;
  };
  const server = startPayload.server?.trim();
  const taskId = startPayload.task?.trim();
  if (!server || !taskId) {
    throw new Error('Invalid PDF compression task response');
  }

  const uploadFormData = new FormData();
  uploadFormData.set('task', taskId);
  uploadFormData.set('file', file, normalizedFileName);

  const uploadResponse = await fetchImpl(`https://${server}/v1/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: uploadFormData,
  });
  if (!uploadResponse.ok) {
    throw new Error(
      await readResponseMessage(uploadResponse, 'Failed to upload PDF file')
    );
  }

  const uploadPayload = (await uploadResponse.json()) as {
    server_filename?: string;
  };
  const serverFileName = uploadPayload.server_filename?.trim();
  if (!serverFileName) {
    throw new Error('Invalid PDF upload response');
  }

  const processResponse = await fetchImpl(`https://${server}/v1/process`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({
      task: taskId,
      tool: 'compress',
      files: [
        {
          server_filename: serverFileName,
          filename: normalizedFileName,
          rotate: 0,
        },
      ],
      compression_level: compressionLevel,
    }),
  });
  if (!processResponse.ok) {
    throw new Error(
      await readResponseMessage(processResponse, 'Failed to process PDF file')
    );
  }

  const processPayload = (await processResponse.json()) as {
    output_filesize?: number;
  };

  const downloadResponse = await fetchImpl(
    `https://${server}/v1/download/${taskId}`,
    {
      method: 'GET',
      headers: authHeaders,
    }
  );
  if (!downloadResponse.ok) {
    throw new Error(
      await readResponseMessage(
        downloadResponse,
        'Failed to download compressed PDF file'
      )
    );
  }

  const compressedBytes = new Uint8Array(await downloadResponse.arrayBuffer());
  if (compressedBytes.byteLength === 0) {
    throw new Error('Compressed PDF response is empty');
  }

  return {
    compressedBytes,
    compressedSize:
      typeof processPayload.output_filesize === 'number' &&
      Number.isFinite(processPayload.output_filesize) &&
      processPayload.output_filesize >= 0
        ? processPayload.output_filesize
        : compressedBytes.byteLength,
    contentType:
      downloadResponse.headers.get('content-type')?.trim() ||
      'application/pdf',
    fileName: compressedFileName,
    originalSize: file.size,
  };
};
