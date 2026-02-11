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

const qpdfFactory = createQpdf as unknown as QpdfFactory;

let qpdfModulePromise: Promise<QpdfModule> | null = null;

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

const pickBestResult = (results: CompressionAttemptResult[], targetSize: number) => {
  const targetMatches = results.filter((result) => result.compressedSize <= targetSize);

  if (targetMatches.length > 0) {
    return targetMatches.reduce((bestResult, currentResult) => {
      return currentResult.compressedSize > bestResult.compressedSize ? currentResult : bestResult;
    });
  }

  return results.reduce((bestResult, currentResult) => {
    return currentResult.compressedSize < bestResult.compressedSize ? currentResult : bestResult;
  });
};

const pickSmallestResult = (results: CompressionAttemptResult[]) => {
  return results.reduce((bestResult, currentResult) => {
    return currentResult.compressedSize < bestResult.compressedSize ? currentResult : bestResult;
  });
};

export const compressPdf = async (inputPdf: Uint8Array, options: CompressionRequestOptions): Promise<CompressionResult> => {
  const qpdfModule = await getQpdfModule();
  const requestedTargetSizeBytes = Math.max(Math.floor(options.targetSizeBytes), 0);
  const profileArgsList = content.compression.profiles.map((profile) => profile.args);
  const results = profileArgsList.map((profileArgs) => runCompressionAttempt(qpdfModule, inputPdf, profileArgs));

  if (requestedTargetSizeBytes <= 0) {
    const bestResult = pickSmallestResult(results);

    return {
      compressedSize: bestResult.compressedSize,
      originalSize: inputPdf.length,
      pdfBuffer: bestResult.pdfBuffer,
      requestedTargetSizeBytes,
      targetAchieved: true
    };
  }

  const bestResult = pickBestResult(results, requestedTargetSizeBytes);

  return {
    compressedSize: bestResult.compressedSize,
    originalSize: inputPdf.length,
    pdfBuffer: bestResult.pdfBuffer,
    requestedTargetSizeBytes,
    targetAchieved: bestResult.compressedSize <= requestedTargetSizeBytes
  };
};
