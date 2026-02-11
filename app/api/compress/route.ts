import { content } from '../../../src/content/content';
import { compressPdf } from '../../../src/lib/pdf-compressor';
import { clampTargetSizeBytes, normalizeTargetSizeUnit, parseTargetSize, validatePdfCandidate } from '../../../src/lib/pdf-validation';

const createErrorResponse = (message: string, status: number) => {
  const body = {
    [content.response.errorKey]: message
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      [content.headers.contentType]: content.mimeTypes.json,
      [content.headers.cacheControl]: content.http.noStoreCache
    }
  });
};

const createContentDisposition = () => {
  return `${content.response.attachmentDisposition}; ${content.response.filenameDirective}="${content.file.outputFallbackName}"`;
};

const stringifyBoolean = (value: boolean) => {
  return value ? content.response.booleanTrue : content.response.booleanFalse;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get(content.form.fieldNames.file);
    const targetSizeValue = formData.get(content.form.fieldNames.targetSizeValue);
    const targetSizeUnit = formData.get(content.form.fieldNames.targetSizeUnit);

    if (!(fileValue instanceof File)) {
      return createErrorResponse(content.errors.fileMissing, 400);
    }

    if (targetSizeValue !== null && typeof targetSizeValue !== 'string') {
      return createErrorResponse(content.errors.invalidTargetSize, 400);
    }

    if (targetSizeUnit !== null && typeof targetSizeUnit !== 'string') {
      return createErrorResponse(content.errors.invalidTargetSize, 400);
    }

    const normalizedTargetSizeUnit = normalizeTargetSizeUnit(typeof targetSizeUnit === 'string' ? targetSizeUnit : content.form.targetSizeUnit.defaultValue);
    const parsedTargetSize = parseTargetSize(
      typeof targetSizeValue === 'string' ? targetSizeValue : content.form.targetSizeDefaultValue,
      normalizedTargetSizeUnit
    );

    if (parsedTargetSize.error.length > 0) {
      return createErrorResponse(parsedTargetSize.error, 400);
    }
    const clampedTargetSizeBytes = clampTargetSizeBytes(fileValue.size, parsedTargetSize.targetSizeBytes);

    const validationError = validatePdfCandidate({
      name: fileValue.name,
      type: fileValue.type
    });

    if (validationError.length > 0) {
      return createErrorResponse(validationError, 400);
    }

    const inputPdf = new Uint8Array(await fileValue.arrayBuffer());
    const compressionResult = await compressPdf(inputPdf, {
      targetSizeBytes: clampedTargetSizeBytes
    });
    const responseBytes = new Uint8Array(compressionResult.pdfBuffer.byteLength);
    responseBytes.set(compressionResult.pdfBuffer);
    const responseBody = new Blob([responseBytes.buffer], {
      type: content.mimeTypes.pdf
    });

    return new Response(responseBody, {
      status: 200,
      headers: {
        [content.headers.contentType]: content.mimeTypes.pdf,
        [content.headers.contentDisposition]: createContentDisposition(),
        [content.headers.cacheControl]: content.http.noStoreCache,
        [content.headers.originalSize]: String(compressionResult.originalSize),
        [content.headers.compressedSize]: String(compressionResult.compressedSize),
        [content.headers.requestedTargetSizeBytes]: String(compressionResult.requestedTargetSizeBytes),
        [content.headers.targetAchieved]: stringifyBoolean(compressionResult.targetAchieved)
      }
    });
  } catch {
    return createErrorResponse(content.errors.compressionFailed, 500);
  }
}
