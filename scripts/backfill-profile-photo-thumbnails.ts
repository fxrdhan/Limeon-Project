import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  PROFILE_PHOTO_BUCKET,
  PROFILE_PHOTO_THUMBNAIL_OUTPUT_QUALITY,
  PROFILE_PHOTO_THUMBNAIL_SIZE,
  buildProfilePhotoThumbnailStoragePath,
} from '../shared/profilePhotoPaths';

config();

const DEFAULT_PAGE_SIZE = 200;

interface UserProfilePhotoRow {
  id: string;
  profilephoto: string | null;
  profilephoto_path: string | null;
  profilephoto_thumb: string | null;
}

interface ScriptOptions {
  dryRun: boolean;
  force: boolean;
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
    force: process.argv.includes('--force'),
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

const isMissingThumbnail = (value: string | null) => !value?.trim();

const extractProfilePhotoPath = (row: UserProfilePhotoRow) => {
  const storedPath = row.profilephoto_path?.trim();
  if (storedPath) {
    return storedPath;
  }

  return extractStoragePathFromPublicUrl(row.profilephoto);
};

const extractStoragePathFromPublicUrl = (value: string | null) => {
  const publicUrl = value?.trim();
  if (!publicUrl) {
    return null;
  }

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${PROFILE_PHOTO_BUCKET}/`;
    const path = url.pathname.split(marker)[1];
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
};

const renderProfilePhotoThumbnail = async (file: Blob) => {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const image = await loadImage(imageBuffer);
  const sourceWidth = Math.max(image.width || 1, 1);
  const sourceHeight = Math.max(image.height || 1, 1);
  const sourceCropSize = Math.max(1, Math.min(sourceWidth, sourceHeight));
  const sourceCropX = Math.max(
    0,
    Math.floor((sourceWidth - sourceCropSize) / 2)
  );
  const sourceCropY = Math.max(
    0,
    Math.floor((sourceHeight - sourceCropSize) / 2)
  );
  const canvas = createCanvas(
    PROFILE_PHOTO_THUMBNAIL_SIZE,
    PROFILE_PHOTO_THUMBNAIL_SIZE
  );
  const context = canvas.getContext('2d');

  context.drawImage(
    image,
    sourceCropX,
    sourceCropY,
    sourceCropSize,
    sourceCropSize,
    0,
    0,
    PROFILE_PHOTO_THUMBNAIL_SIZE,
    PROFILE_PHOTO_THUMBNAIL_SIZE
  );

  let thumbnailMimeType = 'image/webp';
  let thumbnailBuffer: Buffer;

  try {
    thumbnailBuffer = canvas.toBuffer(
      'image/webp',
      PROFILE_PHOTO_THUMBNAIL_OUTPUT_QUALITY
    );
  } catch {
    thumbnailMimeType = 'image/jpeg';
    thumbnailBuffer = canvas.toBuffer(
      'image/jpeg',
      PROFILE_PHOTO_THUMBNAIL_OUTPUT_QUALITY
    );
  }

  return {
    file: new File([new Uint8Array(thumbnailBuffer)], 'profile-thumbnail', {
      type: thumbnailMimeType,
    }),
    mimeType: thumbnailMimeType,
  };
};

const loadPendingUsers = async ({
  force,
  limit,
}: {
  force: boolean;
  limit: number | null;
}) => {
  const users: UserProfilePhotoRow[] = [];

  for (let offset = 0; ; offset += DEFAULT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('users')
      .select('id, profilephoto, profilephoto_path, profilephoto_thumb')
      .not('profilephoto', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + DEFAULT_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as UserProfilePhotoRow[];
    if (page.length === 0) {
      break;
    }

    page.forEach(row => {
      if (force || isMissingThumbnail(row.profilephoto_thumb)) {
        users.push(row);
      }
    });

    if (page.length < DEFAULT_PAGE_SIZE) {
      break;
    }
  }

  if (typeof limit === 'number') {
    return users.slice(0, limit);
  }

  return users;
};

const backfillUserThumbnail = async (row: UserProfilePhotoRow) => {
  const originalPath = extractProfilePhotoPath(row);
  if (!originalPath) {
    throw new Error('Missing original profile photo path');
  }
  const oldThumbnailPath = extractStoragePathFromPublicUrl(
    row.profilephoto_thumb
  );

  const { data: originalFile, error: downloadError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .download(originalPath);
  if (downloadError || !originalFile) {
    throw (
      downloadError ?? new Error('Failed to download original profile photo')
    );
  }

  const thumbnailArtifact = await renderProfilePhotoThumbnail(originalFile);
  const thumbnailPath = buildProfilePhotoThumbnailStoragePath(
    originalPath,
    thumbnailArtifact.mimeType
  );

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(thumbnailPath, thumbnailArtifact.file, {
      contentType: thumbnailArtifact.file.type,
      upsert: true,
    });
  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl: thumbnailUrl },
  } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(thumbnailPath);

  const { error: updateError } = await supabase
    .from('users')
    .update({
      profilephoto_path: originalPath,
      profilephoto_thumb: thumbnailUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (updateError) {
    throw updateError;
  }

  if (oldThumbnailPath && oldThumbnailPath !== thumbnailPath) {
    const { error: removeOldThumbnailError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .remove([oldThumbnailPath]);

    if (removeOldThumbnailError) {
      console.warn(
        `[warn] ${row.id}: unable to remove old thumbnail ${oldThumbnailPath}: ${removeOldThumbnailError.message}`
      );
    }
  }

  return {
    originalPath,
    thumbnailPath,
    thumbnailUrl,
  };
};

const main = async () => {
  const options = parseOptions();
  const targetUsers = await loadPendingUsers(options);

  if (targetUsers.length === 0) {
    console.info('No user profile photos require thumbnail backfill.');
    return;
  }

  console.info(
    `Found ${targetUsers.length} user profile photo(s) to process${
      options.dryRun ? ' (dry-run)' : ''
    }.`
  );

  let processedCount = 0;
  let skippedCount = 0;

  for (const row of targetUsers) {
    const originalPath = extractProfilePhotoPath(row);
    if (!originalPath) {
      skippedCount += 1;
      console.warn(`[skip] ${row.id}: unable to resolve original storage path`);
      continue;
    }

    const thumbnailPath = buildProfilePhotoThumbnailStoragePath(originalPath);

    if (options.dryRun) {
      processedCount += 1;
      console.info(`[dry-run] ${row.id}: ${originalPath} -> ${thumbnailPath}`);
      continue;
    }

    try {
      const result = await backfillUserThumbnail(row);
      processedCount += 1;
      console.info(
        `[ok] ${row.id}: ${result.originalPath} -> ${result.thumbnailPath}`
      );
    } catch (error) {
      skippedCount += 1;
      console.error(
        `[error] ${row.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  console.info(
    `Profile photo thumbnail backfill finished. processed=${processedCount} skipped=${skippedCount}`
  );
};

void main().catch(error => {
  console.error(
    'Profile photo thumbnail backfill failed:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
