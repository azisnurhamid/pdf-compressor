import { content } from '../content/content';

type PdfCandidate = {
  name: string;
  type: string;
};

export type TargetSizeUnit = typeof content.form.targetSizeUnit.kilobytesValue | typeof content.form.targetSizeUnit.megabytesValue;

type TargetSizeParseResult = {
  error: string;
  targetSizeBytes: number;
};

type TargetSizeBounds = {
  maxTargetSizeBytes: number;
  minTargetSizeBytes: number;
};

const bytesPerKilobyte = 1024;

const unitByteSizes: Record<TargetSizeUnit, number> = {
  [content.form.targetSizeUnit.kilobytesValue]: bytesPerKilobyte,
  [content.form.targetSizeUnit.megabytesValue]: content.file.bytesPerMegabyte
};

export const validatePdfCandidate = (candidate: PdfCandidate): string => {
  const normalizedFileName = candidate.name.toLowerCase();
  const normalizedFileType = candidate.type.toLowerCase();
  const hasPdfExtension = normalizedFileName.endsWith(content.file.extension);

  if (!hasPdfExtension) {
    return content.errors.invalidExtension;
  }

  if (normalizedFileType.length === 0) {
    return '';
  }

  const isPdfMime = normalizedFileType === content.mimeTypes.pdf;
  const isOctetStream = normalizedFileType === content.mimeTypes.octetStream;

  if (!isPdfMime && !isOctetStream) {
    return content.errors.invalidType;
  }

  return '';
};

export const normalizeTargetSizeUnit = (value: string | null | undefined): TargetSizeUnit => {
  if (value === content.form.targetSizeUnit.kilobytesValue) {
    return content.form.targetSizeUnit.kilobytesValue;
  }

  return content.form.targetSizeUnit.megabytesValue;
};

export const parseTargetSize = (value: string, unit: TargetSizeUnit): TargetSizeParseResult => {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return {
      error: '',
      targetSizeBytes: 0
    };
  }

  const parsedValue = Number.parseFloat(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return {
      error: content.errors.invalidTargetSize,
      targetSizeBytes: 0
    };
  }

  return {
    error: '',
    targetSizeBytes: Math.floor(parsedValue * unitByteSizes[unit])
  };
};

export const getTargetSizeBounds = (originalSizeBytes: number): TargetSizeBounds => {
  const minTargetRatio = content.compression.minPercent / 100;
  const maxTargetRatio = content.compression.maxPercent / 100;
  const minTargetSizeBytes = Math.max(Math.ceil(originalSizeBytes * minTargetRatio), 1);
  const maxTargetSizeBytes = Math.max(Math.floor(originalSizeBytes * maxTargetRatio), minTargetSizeBytes);

  return {
    maxTargetSizeBytes,
    minTargetSizeBytes
  };
};

export const clampTargetSizeBytes = (originalSizeBytes: number, requestedTargetSizeBytes: number) => {
  const bounds = getTargetSizeBounds(originalSizeBytes);

  if (requestedTargetSizeBytes < bounds.minTargetSizeBytes) {
    return bounds.minTargetSizeBytes;
  }

  if (requestedTargetSizeBytes > bounds.maxTargetSizeBytes) {
    return bounds.maxTargetSizeBytes;
  }

  return requestedTargetSizeBytes;
};
