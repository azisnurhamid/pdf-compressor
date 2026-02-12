import createQpdf from 'qpdf-wasm-esm-embedded';
import { content } from '../content/content';

type QpdfFs = {
  readFile: (filePath: string) => Uint8Array;
  unlink: (filePath: string) => void;
  writeFile: (filePath: string, data: Uint8Array) => void;
};

type QpdfModule = {
  FS: QpdfFs;
  callMain: (args: string[]) => number;
};

type QpdfFactory = () => Promise<QpdfModule>;

type CompressionRequestOptions = {
  targetSizeBytes: number;
};

type CompressionAttemptResult = {
  compressedSize: number;
  pdfBuffer: Uint8Array;
};

type CompressionResult = {
  compressedSize: number;
  originalSize: number;
  pdfBuffer: Uint8Array;
  requestedTargetSizeBytes: number;
  targetAchieved: boolean;
};

type ProfileRunSummary = {
  matchedTargetResult: CompressionAttemptResult | null;
  smallestResult: CompressionAttemptResult;
};

const qpdfFactory = createQpdf as unknown as QpdfFactory;

let qpdfModulePromise: Promise<QpdfModule> | null = null;

const bytesPerMegabyte = 1024 * 1024;
const largePdfThresholdBytes = 20 * bytesPerMegabyte;
const maxProfilesForLargePdf = 2;

const getQpdfModule = () => {
  if (!qpdfModulePromise) {
    qpdfModulePromise = qpdfFactory();
  }

  return qpdfModulePromise;
};

const buildVirtualPath = (prefix: string, token: string) => {
  return `${content.virtualFs.root}${prefix}${content.virtualFs.tokenSeparator}${token}${content.file.extension}`;
};

const buildToken = () => {
  return `${Date.now()}${content.virtualFs.tokenSeparator}${Math.random().toString(36).slice(2, 12)}`;
};

const cleanup = (fs: QpdfFs, filePaths: string[]) => {
  for (const filePath of filePaths) {
    try {
      fs.unlink(filePath);
    } catch {}
  }
};

const runCompressionAttempt = (qpdfModule: QpdfModule, inputPdf: Uint8Array, profileArgs: readonly string[]): CompressionAttemptResult => {
  const token = buildToken();
  const inputPath = buildVirtualPath(content.virtualFs.inputPrefix, token);
  const outputPath = buildVirtualPath(content.virtualFs.outputPrefix, token);
  const args = [inputPath, outputPath, ...content.compression.baseArgs, ...profileArgs];

  qpdfModule.FS.writeFile(inputPath, inputPdf);

  try {
    const exitCode = qpdfModule.callMain(args);

    if (exitCode !== 0) {
      throw new Error(content.errors.compressionFailed);
    }

    const outputPdf = qpdfModule.FS.readFile(outputPath);
    const resultPdf = outputPdf.length <= inputPdf.length ? outputPdf : inputPdf;

    return {
      compressedSize: resultPdf.length,
      pdfBuffer: resultPdf
    };
  } finally {
    cleanup(qpdfModule.FS, [inputPath, outputPath]);
  }
};

const pickSmallestResult = (results: CompressionAttemptResult[]) => {
  return results.reduce((bestResult, currentResult) => {
    return currentResult.compressedSize < bestResult.compressedSize ? currentResult : bestResult;
  });
};

const getProfileArgsList = (inputPdfSize: number, requestedTargetSizeBytes: number) => {
  const allProfiles = content.compression.profiles.map((profile) => profile.args);

  if (requestedTargetSizeBytes > 0 && inputPdfSize >= largePdfThresholdBytes) {
    return allProfiles.slice(0, maxProfilesForLargePdf);
  }

  return allProfiles;
};

const runProfiles = (
  qpdfModule: QpdfModule,
  inputPdf: Uint8Array,
  requestedTargetSizeBytes: number
): ProfileRunSummary => {
  const profileArgsList = getProfileArgsList(inputPdf.length, requestedTargetSizeBytes);
  const results: CompressionAttemptResult[] = [];

  for (const profileArgs of profileArgsList) {
    const currentResult = runCompressionAttempt(qpdfModule, inputPdf, profileArgs);
    results.push(currentResult);

    // Profiles are ordered from lighter to stronger compression; first hit
    // generally preserves the best size under target while saving compute time.
    if (requestedTargetSizeBytes > 0 && currentResult.compressedSize <= requestedTargetSizeBytes) {
      return {
        matchedTargetResult: currentResult,
        smallestResult: pickSmallestResult(results)
      };
    }
  }

  return {
    matchedTargetResult: null,
    smallestResult: pickSmallestResult(results)
  };
};

export const compressPdf = async (inputPdf: Uint8Array, options: CompressionRequestOptions): Promise<CompressionResult> => {
  const qpdfModule = await getQpdfModule();
  const requestedTargetSizeBytes = Math.max(Math.floor(options.targetSizeBytes), 0);
  const profileRunSummary = runProfiles(qpdfModule, inputPdf, requestedTargetSizeBytes);

  if (requestedTargetSizeBytes <= 0) {
    const bestResult = profileRunSummary.smallestResult;

    return {
      compressedSize: bestResult.compressedSize,
      originalSize: inputPdf.length,
      pdfBuffer: bestResult.pdfBuffer,
      requestedTargetSizeBytes,
      targetAchieved: true
    };
  }

  const bestResult = profileRunSummary.matchedTargetResult ?? profileRunSummary.smallestResult;

  return {
    compressedSize: bestResult.compressedSize,
    originalSize: inputPdf.length,
    pdfBuffer: bestResult.pdfBuffer,
    requestedTargetSizeBytes,
    targetAchieved: profileRunSummary.matchedTargetResult !== null
  };
};
