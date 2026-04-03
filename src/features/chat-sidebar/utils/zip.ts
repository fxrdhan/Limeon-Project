const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

const textEncoder = new TextEncoder();
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_VERSION = 20;

const sanitizeZipEntryName = (fileName: string) => {
  const normalizedFileName = fileName.trim().replace(/[\\/:*?"<>|]+/g, '_');

  if (!normalizedFileName) {
    return 'file';
  }

  return normalizedFileName.replace(/^\.+/, '') || 'file';
};

const splitFileNameParts = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return {
      baseName: fileName,
      extension: '',
    };
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex),
  };
};

const ensureUniqueZipEntryNames = (fileNames: string[]) => {
  const occurrences = new Map<string, number>();

  return fileNames.map(fileName => {
    const safeFileName = sanitizeZipEntryName(fileName);
    const nextOccurrence = (occurrences.get(safeFileName) ?? 0) + 1;

    occurrences.set(safeFileName, nextOccurrence);

    if (nextOccurrence === 1) {
      return safeFileName;
    }

    const { baseName, extension } = splitFileNameParts(safeFileName);
    return `${baseName} (${nextOccurrence})${extension}`;
  });
};

const computeCrc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
};

const getDosDateTime = (date: Date) => {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
    dosTime: (hours << 11) | (minutes << 5) | seconds,
  };
};

const createLocalFileHeader = ({
  fileNameBytes,
  crc32,
  fileSize,
  dosDate,
  dosTime,
}: {
  fileNameBytes: Uint8Array;
  crc32: number;
  fileSize: number;
  dosDate: number;
  dosTime: number;
}) => {
  const header = new Uint8Array(30 + fileNameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_UTF8_FLAG, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, dosTime, true);
  view.setUint16(12, dosDate, true);
  view.setUint32(14, crc32, true);
  view.setUint32(18, fileSize, true);
  view.setUint32(22, fileSize, true);
  view.setUint16(26, fileNameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(fileNameBytes, 30);

  return header;
};

const createCentralDirectoryHeader = ({
  fileNameBytes,
  crc32,
  fileSize,
  dosDate,
  dosTime,
  localHeaderOffset,
}: {
  fileNameBytes: Uint8Array;
  crc32: number;
  fileSize: number;
  dosDate: number;
  dosTime: number;
  localHeaderOffset: number;
}) => {
  const header = new Uint8Array(46 + fileNameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_VERSION, true);
  view.setUint16(8, ZIP_UTF8_FLAG, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, dosTime, true);
  view.setUint16(14, dosDate, true);
  view.setUint32(16, crc32, true);
  view.setUint32(20, fileSize, true);
  view.setUint32(24, fileSize, true);
  view.setUint16(28, fileNameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  header.set(fileNameBytes, 46);

  return header;
};

const createEndOfCentralDirectoryRecord = ({
  totalEntries,
  centralDirectorySize,
  centralDirectoryOffset,
}: {
  totalEntries: number;
  centralDirectorySize: number;
  centralDirectoryOffset: number;
}) => {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, totalEntries, true);
  view.setUint16(10, totalEntries, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return record;
};

export const buildZipBlob = async (
  files: Array<{
    blob: Blob;
    fileName: string;
  }>
) => {
  const normalizedFiles = files.map(file => ({
    ...file,
    fileName: file.fileName,
  }));
  const uniqueFileNames = ensureUniqueZipEntryNames(
    normalizedFiles.map(file => file.fileName)
  );
  const now = new Date();
  const { dosDate, dosTime } = getDosDateTime(now);
  const localFileParts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let nextOffset = 0;

  for (const [index, file] of normalizedFiles.entries()) {
    const fileBytes = new Uint8Array(await file.blob.arrayBuffer());
    const fileNameBytes = textEncoder.encode(uniqueFileNames[index] || 'file');
    const crc32 = computeCrc32(fileBytes);
    const localFileHeader = createLocalFileHeader({
      fileNameBytes,
      crc32,
      fileSize: fileBytes.length,
      dosDate,
      dosTime,
    });

    localFileParts.push(localFileHeader, fileBytes);
    centralDirectoryParts.push(
      createCentralDirectoryHeader({
        fileNameBytes,
        crc32,
        fileSize: fileBytes.length,
        dosDate,
        dosTime,
        localHeaderOffset: nextOffset,
      })
    );

    nextOffset += localFileHeader.length + fileBytes.length;
  }

  const centralDirectoryOffset = nextOffset;
  const centralDirectorySize = centralDirectoryParts.reduce(
    (totalSize, part) => totalSize + part.length,
    0
  );

  return new Blob(
    [
      ...localFileParts,
      ...centralDirectoryParts,
      createEndOfCentralDirectoryRecord({
        totalEntries: normalizedFiles.length,
        centralDirectorySize,
        centralDirectoryOffset,
      }),
    ] as BlobPart[],
    {
      type: 'application/zip',
    }
  );
};
