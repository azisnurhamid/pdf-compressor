import { PDFDocument } from 'pdf-lib';

type PdfJsModule = {
  getDocument: (src: {
    data: Uint8Array;
    disableWorker: boolean;
    isEvalSupported: boolean;
    useSystemFonts: boolean;
  }) => {
    promise: Promise<PdfJsDocument>;
  };
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  cleanup: () => void;
  destroy: () => void;
};

type PdfJsPage = {
  cleanup: () => void;
  getViewport: (options: { scale: number }) => {
    height: number;
    width: number;
  };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: {
      height: number;
      width: number;
    };
  }) => {
    promise: Promise<void>;
  };
};

type LossyRasterProfile = {
  jpegQuality: number;
  maxRenderWidth: number;
  scale: number;
};

const lossyRasterProfiles: readonly LossyRasterProfile[] = [
  {
    jpegQuality: 0.82,
    maxRenderWidth: 2200,
    scale: 1
  },
  {
    jpegQuality: 0.68,
    maxRenderWidth: 1900,
    scale: 0.9
  },
  {
    jpegQuality: 0.56,
    maxRenderWidth: 1600,
    scale: 0.8
  },
  {
    jpegQuality: 0.46,
    maxRenderWidth: 1400,
    scale: 0.7
  },
  {
    jpegQuality: 0.36,
    maxRenderWidth: 1100,
    scale: 0.55
  },
  {
    jpegQuality: 0.27,
    maxRenderWidth: 900,
    scale: 0.45
  },
  {
    jpegQuality: 0.2,
    maxRenderWidth: 700,
    scale: 0.35
  }
] as const;

const minimumRenderScale = 0.1;
const maximumCanvasWidth = 4096;
const maximumCanvasHeight = 4096;
const maximumCanvasArea = 16_000_000;

const getPdfJsModule = async (): Promise<PdfJsModule> => {
  return (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
};

const canvasToJpegBytes = async (canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> => {
  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Unable to create JPEG blob from canvas.'));
      },
      'image/jpeg',
      quality
    );
  });

  return new Uint8Array(await imageBlob.arrayBuffer());
};

const getSafeRenderScale = (
  pageWidth: number,
  pageHeight: number,
  requestedScale: number,
  maxRenderWidth: number
) => {
  let safeScale = Math.min(requestedScale, maxRenderWidth / pageWidth);

  if (!Number.isFinite(safeScale) || safeScale <= 0) {
    safeScale = minimumRenderScale;
  }

  safeScale = Math.min(safeScale, maximumCanvasWidth / pageWidth);
  safeScale = Math.min(safeScale, maximumCanvasHeight / pageHeight);

  const pageArea = pageWidth * pageHeight;

  if (pageArea > 0) {
    safeScale = Math.min(safeScale, Math.sqrt(maximumCanvasArea / pageArea));
  }

  return Math.max(safeScale, minimumRenderScale);
};

const buildLossyPdfWithProfile = async (sourceDocument: PdfJsDocument, profile: LossyRasterProfile): Promise<Uint8Array> => {
  const outputPdfDocument = await PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= sourceDocument.numPages; pageNumber += 1) {
    const sourcePage = await sourceDocument.getPage(pageNumber);
    const outputPageSize = sourcePage.getViewport({ scale: 1 });
    const renderScale = getSafeRenderScale(outputPageSize.width, outputPageSize.height, profile.scale, profile.maxRenderWidth);
    const renderViewport = sourcePage.getViewport({ scale: renderScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(renderViewport.width));
    canvas.height = Math.max(1, Math.round(renderViewport.height));
    const canvasContext = canvas.getContext('2d', { alpha: false });

    if (!canvasContext) {
      throw new Error('Canvas context is unavailable.');
    }

    canvasContext.fillStyle = '#ffffff';
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    await sourcePage.render({
      canvasContext,
      viewport: renderViewport
    }).promise;

    const jpegBytes = await canvasToJpegBytes(canvas, profile.jpegQuality);
    const embeddedImage = await outputPdfDocument.embedJpg(jpegBytes);
    const outputPage = outputPdfDocument.addPage([outputPageSize.width, outputPageSize.height]);
    outputPage.drawImage(embeddedImage, {
      height: outputPageSize.height,
      width: outputPageSize.width,
      x: 0,
      y: 0
    });

    sourcePage.cleanup();
    canvas.width = 1;
    canvas.height = 1;
  }

  return outputPdfDocument.save({
    addDefaultPage: false,
    useObjectStreams: true
  });
};

export const compressPdfLossy = async (inputPdf: Uint8Array, targetSizeBytes: number): Promise<Uint8Array> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return inputPdf;
  }

  const pdfJsModule = await getPdfJsModule();
  const loadingTask = pdfJsModule.getDocument({
    data: inputPdf,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true
  });
  const sourceDocument = await loadingTask.promise;
  let smallestResult = inputPdf;

  try {
    for (const profile of lossyRasterProfiles) {
      let currentResult: Uint8Array;

      try {
        currentResult = await buildLossyPdfWithProfile(sourceDocument, profile);
      } catch {
        continue;
      }

      if (currentResult.length < smallestResult.length) {
        smallestResult = currentResult;
      }

      if (targetSizeBytes > 0 && currentResult.length <= targetSizeBytes) {
        return currentResult;
      }
    }

    return smallestResult;
  } finally {
    sourceDocument.cleanup();
    sourceDocument.destroy();
  }
};
