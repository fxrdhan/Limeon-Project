import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  CHAT_PDF_COMPRESS_DEFAULT_LEVEL,
  CHAT_PDF_COMPRESS_MAX_BYTES,
  type ChatPdfCompressionLevel,
} from '../../../shared/chatFunctionContracts.ts';
import { compressPdfWithIloveApi } from './actions.ts';

const buildCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get('Origin');
  const accessControlAllowOrigin =
    requestOrigin && requestOrigin.length > 0 ? requestOrigin : '*';

  return {
    'Access-Control-Allow-Origin': accessControlAllowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers':
      'Content-Disposition, X-Chat-Pdf-Compress-File-Name, X-Chat-Pdf-Compress-Original-Size, X-Chat-Pdf-Compress-Compressed-Size',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(req),
    },
  });

const resolveCompressionLevel = (value?: string | null): ChatPdfCompressionLevel => {
  const normalizedValue = value?.trim().toLowerCase();
  if (normalizedValue === 'low') {
    return 'low';
  }
  if (normalizedValue === 'extreme') {
    return 'extreme';
  }

  return CHAT_PDF_COMPRESS_DEFAULT_LEVEL;
};

const encodeContentDispositionFilename = (value: string) =>
  encodeURIComponent(value).replace(/['()*]/g, character =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: buildCorsHeaders(req),
    });
  }

  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorizationHeader = req.headers.get('Authorization');
  const iloveApiPublicKey = Deno.env.get('ILOVEAPI_PUBLIC_KEY')?.trim();
  const iloveApiSecretKey = Deno.env.get('ILOVEAPI_SECRET_KEY')?.trim();
  const iloveApiRegion = Deno.env.get('ILOVEAPI_REGION')?.trim() || 'us';

  if (
    !supabaseUrl ||
    !anonKey ||
    !iloveApiPublicKey ||
    !iloveApiSecretKey
  ) {
    return json(req, 500, {
      error: 'Missing PDF compression environment variables',
    });
  }

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return json(req, 401, { error: 'Missing auth token' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user?.id) {
    return json(req, 401, { error: 'Unauthorized' });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json(req, 400, { error: 'Invalid multipart form-data body' });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return json(req, 400, { error: 'file is required' });
  }

  const isPdfFile =
    file.type.toLowerCase() === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfFile) {
    return json(req, 415, { error: 'File harus berupa PDF' });
  }

  if (file.size > CHAT_PDF_COMPRESS_MAX_BYTES) {
    return json(req, 413, {
      error: 'Ukuran PDF maksimal 50 MB untuk kompres',
    });
  }

  try {
    const compressedPdf = await compressPdfWithIloveApi({
      file,
      compressionLevel: resolveCompressionLevel(
        formData.get('compression_level')?.toString()
      ),
      credentials: {
        publicKey: iloveApiPublicKey,
        secretKey: iloveApiSecretKey,
        region: iloveApiRegion,
      },
    });

    return new Response(compressedPdf.compressedBytes, {
      status: 200,
      headers: {
        'Content-Type': compressedPdf.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeContentDispositionFilename(compressedPdf.fileName)}`,
        'Cache-Control': 'no-store',
        'X-Chat-Pdf-Compress-File-Name': compressedPdf.fileName,
        'X-Chat-Pdf-Compress-Original-Size': String(
          compressedPdf.originalSize
        ),
        'X-Chat-Pdf-Compress-Compressed-Size': String(
          compressedPdf.compressedSize
        ),
        ...buildCorsHeaders(req),
      },
    });
  } catch (error) {
    console.error('Failed to compress PDF via iLoveAPI', error);
    return json(req, 502, {
      error:
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Gagal mengompres PDF',
    });
  }
});
