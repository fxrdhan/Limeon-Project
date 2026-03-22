import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { buildImagePreviewStoragePath } from '../src/features/chat-sidebar/utils/image-preview-path';

config();

const CHAT_BUCKET = 'chat';
const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_PREVIEW_TARGET_SIZE = 320;
const DEFAULT_IMAGE_QUALITY = 0.72;

interface ChatImageMessageRow {
  id: string;
  created_at: string;
  file_mime_type: string | null;
  file_preview_url: string | null;
  file_storage_path: string | null;
  message_type: 'image' | 'file';
}

interface ScriptOptions {
  dryRun: boolean;
  limit: number | null;
}

const readFlagValue = (name: string) => {
  const args = process.argv.slice(2);
  const inlineArg = args.find(argument => argument.startsWith(`${name}=`));
  if (inlineArg) {
    return inlineArg.slice(name.length + 1);
  }

  const flagIndex = args.indexOf(name);
  if (flagIndex === -1) {
    return null;
  }

  return args[flagIndex + 1] ?? null;
};

const parseOptions = (): ScriptOptions => {
  const limitValue = readFlagValue('--limit');
  const parsedLimit =
    limitValue && Number.isFinite(Number(limitValue))
      ? Math.max(0, Number(limitValue))
      : null;

  return {
    dryRun: process.argv.includes('--dry-run'),
    limit: parsedLimit,
  };
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase URL or Service Role Key');
  console.error(
    'Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY) in your .env file'
  );
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

const isMissingPreviewPath = (value: string | null) => !value?.trim();

const renderImagePreviewUploadArtifact = async (
  file: Blob,
  fileStoragePath: string
) => {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const image = await loadImage(imageBuffer);
  const maxSourceSide = Math.max(image.width || 1, image.height || 1);
  const scale = Math.min(1, DEFAULT_PREVIEW_TARGET_SIZE / maxSourceSide);
  const targetWidth = Math.max(1, Math.round((image.width || 1) * scale));
  const targetHeight = Math.max(1, Math.round((image.height || 1) * scale));
  const canvas = createCanvas(targetWidth, targetHeight);
  const context = canvas.getContext('2d');

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  let previewMimeType = 'image/webp';
  let previewBuffer: Buffer;

  try {
    previewBuffer = canvas.toBuffer('image/webp', DEFAULT_IMAGE_QUALITY);
  } catch {
    previewMimeType = 'image/jpeg';
    previewBuffer = canvas.toBuffer('image/jpeg', DEFAULT_IMAGE_QUALITY);
  }

  const previewPath = buildImagePreviewStoragePath(
    fileStoragePath,
    previewMimeType
  );
  const previewBytes = new Uint8Array(previewBuffer);

  return {
    previewFile: new File(
      [previewBytes],
      previewPath.split('/').pop() || 'preview',
      {
        type: previewMimeType,
      }
    ),
    previewPath,
  };
};

const listChatMessagesPage = async (
  messageType: 'image' | 'file',
  offset: number
) => {
  let query = supabase
    .from('chat_messages')
    .select(
      'id, message_type, file_mime_type, file_preview_url, file_storage_path, created_at'
    )
    .eq('message_type', messageType)
    .order('created_at', { ascending: true })
    .range(offset, offset + DEFAULT_PAGE_SIZE - 1);

  if (messageType === 'file') {
    query = query.ilike('file_mime_type', 'image/%');
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as ChatImageMessageRow[];
};

const loadPendingImageMessages = async (limit: number | null) => {
  const pendingMessages: ChatImageMessageRow[] = [];

  for (const messageType of ['image', 'file'] as const) {
    for (let offset = 0; ; offset += DEFAULT_PAGE_SIZE) {
      const page = await listChatMessagesPage(messageType, offset);
      if (page.length === 0) {
        break;
      }

      page.forEach(message => {
        if (!message.file_storage_path?.trim()) {
          return;
        }

        if (!isMissingPreviewPath(message.file_preview_url)) {
          return;
        }

        pendingMessages.push(message);
      });

      if (page.length < DEFAULT_PAGE_SIZE) {
        break;
      }
    }
  }

  pendingMessages.sort((left, right) => {
    const createdAtComparison = left.created_at.localeCompare(right.created_at);
    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.id.localeCompare(right.id);
  });

  if (typeof limit === 'number') {
    return pendingMessages.slice(0, limit);
  }

  return pendingMessages;
};

const uploadAndPersistPreview = async (message: ChatImageMessageRow) => {
  const fileStoragePath = message.file_storage_path?.trim();
  if (!fileStoragePath) {
    throw new Error('Missing file storage path');
  }

  const { data: originalFile, error: downloadError } = await supabase.storage
    .from(CHAT_BUCKET)
    .download(fileStoragePath);
  if (downloadError || !originalFile) {
    throw downloadError ?? new Error('Failed to download original image');
  }

  const renderedPreview = await renderImagePreviewUploadArtifact(
    originalFile,
    fileStoragePath
  );

  const { error: uploadError } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(renderedPreview.previewPath, renderedPreview.previewFile, {
      contentType: renderedPreview.previewFile.type,
      upsert: true,
    });
  if (uploadError) {
    throw uploadError;
  }

  const { error: updateError } = await supabase
    .from('chat_messages')
    .update({
      file_preview_error: null,
      file_preview_page_count: null,
      file_preview_status: 'ready',
      file_preview_url: renderedPreview.previewPath,
    })
    .eq('id', message.id);
  if (!updateError) {
    return renderedPreview.previewPath;
  }

  await supabase.storage
    .from(CHAT_BUCKET)
    .remove([renderedPreview.previewPath]);
  throw updateError;
};

const main = async () => {
  const options = parseOptions();

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: bun scripts/backfill-chat-image-previews.ts [--limit <number>] [--dry-run]

Options:
  --limit <number>  Process only the first N pending image previews
  --dry-run         Show pending messages without uploading or updating metadata
  -h, --help        Show this help message
`);
    return;
  }

  const pendingMessages = await loadPendingImageMessages(options.limit);

  console.log(
    `[chat-image-preview-backfill] found ${pendingMessages.length} pending messages`
  );
  if (pendingMessages.length === 0) {
    return;
  }

  if (options.dryRun) {
    pendingMessages.forEach(message => {
      console.log(
        `[dry-run] ${message.id} ${message.message_type} ${message.file_storage_path}`
      );
    });
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const [index, message] of pendingMessages.entries()) {
    try {
      const previewPath = await uploadAndPersistPreview(message);
      successCount += 1;
      console.log(
        `[${index + 1}/${pendingMessages.length}] ok ${message.id} -> ${previewPath}`
      );
    } catch (error) {
      failureCount += 1;
      console.error(
        `[${index + 1}/${pendingMessages.length}] failed ${message.id}:`,
        error
      );
    }
  }

  console.log(
    `[chat-image-preview-backfill] completed: ${successCount} succeeded, ${failureCount} failed`
  );

  if (failureCount > 0) {
    process.exitCode = 1;
  }
};

void main();
