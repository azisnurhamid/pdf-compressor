'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { content } from '../src/content/content';
import { compressPdf } from '../src/lib/pdf-compressor';
import {
  clampTargetSizeBytes,
  getTargetSizeBounds,
  normalizeTargetSizeUnit,
  parseTargetSize,
  type TargetSizeUnit,
  validatePdfCandidate
} from '../src/lib/pdf-validation';

const bytesPerKilobyte = 1024;
const bytesPerMegabyte = bytesPerKilobyte * bytesPerKilobyte;
const decimalPlaces = 2;

const formatBytes = (bytes: number) => {
  if (bytes < bytesPerKilobyte) {
    return `${bytes} ${content.formats.bytesUnit}`;
  }

  if (bytes < bytesPerMegabyte) {
    return `${(bytes / bytesPerKilobyte).toFixed(decimalPlaces)} ${content.formats.kilobytesUnit}`;
  }

  return `${(bytes / bytesPerMegabyte).toFixed(decimalPlaces)} ${content.formats.megabytesUnit}`;
};

const getTargetUnitDivisor = (unit: TargetSizeUnit) => {
  if (unit === content.form.targetSizeUnit.kilobytesValue) {
    return bytesPerKilobyte;
  }

  return content.file.bytesPerMegabyte;
};

const getTargetUnitLabel = (unit: TargetSizeUnit) => {
  if (unit === content.form.targetSizeUnit.kilobytesValue) {
    return content.formats.kilobytesUnit;
  }

  return content.formats.megabytesUnit;
};

const formatTargetSizeValue = (bytes: number, unit: TargetSizeUnit) => {
  const normalizedValue = bytes / getTargetUnitDivisor(unit);
  return `${normalizedValue.toFixed(decimalPlaces)} ${getTargetUnitLabel(unit)}`;
};

const formatTargetSizeInput = (bytes: number, unit: TargetSizeUnit) => {
  return (bytes / getTargetUnitDivisor(unit)).toFixed(decimalPlaces);
};

const getTargetSizeStep = (unit: TargetSizeUnit) => {
  if (unit === content.form.targetSizeUnit.kilobytesValue) {
    return content.form.targetSizeStepValues.kb;
  }

  return content.form.targetSizeStepValues.mb;
};

const formatCompressionRange = () => {
  return `${content.compression.minPercent}${content.formats.percentUnit} - ${content.compression.maxPercent}${content.formats.percentUnit}`;
};

const formatSavedPercent = (originalSize: number, compressedSize: number) => {
  if (originalSize <= 0) {
    return `0${content.formats.percentUnit}`;
  }

  const savedRatio = (originalSize - compressedSize) / originalSize;
  const savedPercent = Math.max(savedRatio * 100, 0);

  return `${savedPercent.toFixed(decimalPlaces)}${content.formats.percentUnit}`;
};

const formatSavedBytes = (originalSize: number, compressedSize: number) => {
  return formatBytes(Math.max(originalSize - compressedSize, 0));
};

export default function HomePage() {
  const [inputKey, setInputKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetSizeInput, setTargetSizeInput] = useState<string>(content.form.targetSizeDefaultValue);
  const [targetSizeUnit, setTargetSizeUnit] = useState<TargetSizeUnit>(content.form.targetSizeUnit.defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [requestedTargetSizeBytes, setRequestedTargetSizeBytes] = useState(0);
  const [targetAchieved, setTargetAchieved] = useState(true);

  const targetSizePreview = useMemo(() => {
    const parsedTarget = parseTargetSize(targetSizeInput, targetSizeUnit);

    if (parsedTarget.error.length > 0) {
      return content.errors.invalidTargetSize;
    }

    if (!selectedFile) {
      return formatTargetSizeValue(parsedTarget.targetSizeBytes, targetSizeUnit);
    }

    const clampedTargetBytes = clampTargetSizeBytes(selectedFile.size, parsedTarget.targetSizeBytes);

    return formatTargetSizeValue(clampedTargetBytes, targetSizeUnit);
  }, [selectedFile, targetSizeInput, targetSizeUnit]);

  const targetSizeBoundsText = useMemo(() => {
    if (!selectedFile) {
      return content.ui.noFileText;
    }

    const bounds = getTargetSizeBounds(selectedFile.size);

    return `${formatTargetSizeValue(bounds.minTargetSizeBytes, targetSizeUnit)} - ${formatTargetSizeValue(bounds.maxTargetSizeBytes, targetSizeUnit)}`;
  }, [selectedFile, targetSizeUnit]);

  const targetSizeInputBounds = useMemo(() => {
    if (!selectedFile) {
      return {
        max: undefined,
        min: content.form.targetSizeMinValue
      };
    }

    const bounds = getTargetSizeBounds(selectedFile.size);

    return {
      max: formatTargetSizeInput(bounds.maxTargetSizeBytes, targetSizeUnit),
      min: formatTargetSizeInput(bounds.minTargetSizeBytes, targetSizeUnit)
    };
  }, [selectedFile, targetSizeUnit]);

  useEffect(() => {
    return () => {
      if (downloadUrl.length > 0) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const clearDownloadUrl = () => {
    setDownloadUrl((currentUrl) => {
      if (currentUrl.length > 0) {
        URL.revokeObjectURL(currentUrl);
      }

      return '';
    });
  };

  const resetResultState = () => {
    setOriginalSize(0);
    setCompressedSize(0);
    setRequestedTargetSizeBytes(0);
    setTargetAchieved(true);
  };

  const handleReset = () => {
    clearDownloadUrl();
    setSelectedFile(null);
    setTargetSizeInput(content.form.targetSizeDefaultValue);
    setTargetSizeUnit(content.form.targetSizeUnit.defaultValue);
    setErrorMessage('');
    resetResultState();
    setInputKey((currentValue) => currentValue + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage(content.errors.fileMissing);
      return;
    }

    const validationError = validatePdfCandidate({
      name: selectedFile.name,
      type: selectedFile.type
    });

    if (validationError.length > 0) {
      setErrorMessage(validationError);
      return;
    }

    const parsedTargetSize = parseTargetSize(targetSizeInput, targetSizeUnit);

    if (parsedTargetSize.error.length > 0) {
      setErrorMessage(parsedTargetSize.error);
      return;
    }

    const clampedTargetSizeBytes = clampTargetSizeBytes(selectedFile.size, parsedTargetSize.targetSizeBytes);
    const normalizedTargetSizeInput = formatTargetSizeInput(clampedTargetSizeBytes, targetSizeUnit);

    setIsLoading(true);
    setErrorMessage('');
    clearDownloadUrl();
    resetResultState();
    setTargetSizeInput(normalizedTargetSizeInput);

    try {
      const inputPdf = new Uint8Array(await selectedFile.arrayBuffer());
      const compressionResult = await compressPdf(inputPdf, {
        targetSizeBytes: clampedTargetSizeBytes
      });
      const pdfBlob = new Blob([compressionResult.pdfBuffer as Uint8Array<ArrayBuffer>], {
        type: content.mimeTypes.pdf
      });
      const nextDownloadUrl = URL.createObjectURL(pdfBlob);

      setOriginalSize(compressionResult.originalSize);
      setCompressedSize(compressionResult.compressedSize);
      setRequestedTargetSizeBytes(compressionResult.requestedTargetSizeBytes);
      setTargetAchieved(compressionResult.targetAchieved);
      setDownloadUrl(nextDownloadUrl);
    } catch {
      setErrorMessage(content.errors.compressionFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const isResultReady = downloadUrl.length > 0;
  const statusText = errorMessage.length > 0 ? content.ui.statusError : isResultReady ? content.ui.statusSuccess : content.ui.statusReady;

  return (
    <main className="page">
      <section className="card">
        <header className="header">
          <h1 className="title">{content.ui.pageTitle}</h1>
          <p className="description">{content.ui.pageDescription}</p>
        </header>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="field" htmlFor={content.form.fieldNames.file}>
            <span className="label">{content.ui.fileInputLabel}</span>
            <input
              key={inputKey}
              id={content.form.fieldNames.file}
              aria-label={content.aria.fileInput}
              className="input"
              type={content.html.inputTypeFile}
              accept={content.form.accept}
              onChange={(event) => {
                const file = event.currentTarget.files ? event.currentTarget.files[0] : null;
                setSelectedFile(file);
                setErrorMessage('');
                clearDownloadUrl();
                resetResultState();
              }}
            />
          </label>

          <label className="field" htmlFor={content.form.fieldNames.targetSizeUnit}>
            <span className="label">{content.ui.targetUnitLabel}</span>
            <select
              id={content.form.fieldNames.targetSizeUnit}
              aria-label={content.aria.targetUnitSelect}
              className="input"
              value={targetSizeUnit}
              onChange={(event) => {
                const nextUnit = normalizeTargetSizeUnit(event.currentTarget.value);
                const parsedTargetSize = parseTargetSize(targetSizeInput, targetSizeUnit);

                setTargetSizeUnit(nextUnit);
                setErrorMessage('');

                if (parsedTargetSize.error.length > 0) {
                  return;
                }

                const adjustedTargetSizeBytes = selectedFile
                  ? clampTargetSizeBytes(selectedFile.size, parsedTargetSize.targetSizeBytes)
                  : parsedTargetSize.targetSizeBytes;

                setTargetSizeInput(formatTargetSizeInput(adjustedTargetSizeBytes, nextUnit));
              }}
            >
              <option value={content.form.targetSizeUnit.kilobytesValue}>{content.formats.kilobytesUnit}</option>
              <option value={content.form.targetSizeUnit.megabytesValue}>{content.formats.megabytesUnit}</option>
            </select>
          </label>

          <label className="field" htmlFor={content.form.fieldNames.targetSizeValue}>
            <span className="label">{content.ui.targetSizeLabel}</span>
            <input
              id={content.form.fieldNames.targetSizeValue}
              aria-label={content.aria.targetSizeInput}
              className="input"
              type={content.html.inputTypeNumber}
              value={targetSizeInput}
              min={targetSizeInputBounds.min}
              max={targetSizeInputBounds.max}
              step={getTargetSizeStep(targetSizeUnit)}
              onChange={(event) => {
                setTargetSizeInput(event.currentTarget.value);
                setErrorMessage('');
              }}
              onBlur={() => {
                if (!selectedFile) {
                  return;
                }

                const parsedTargetSize = parseTargetSize(targetSizeInput, targetSizeUnit);

                if (parsedTargetSize.error.length > 0) {
                  return;
                }

                const clampedTargetSizeBytes = clampTargetSizeBytes(selectedFile.size, parsedTargetSize.targetSizeBytes);
                setTargetSizeInput(formatTargetSizeInput(clampedTargetSizeBytes, targetSizeUnit));
              }}
            />
            <p className="levelDescription">{content.ui.targetSizeHint}</p>
          </label>

          <div className="metaGrid">
            <p className="metaItem">
              <span>{content.ui.selectedFileLabel}</span>
              <strong>{selectedFile ? selectedFile.name : content.ui.noFileText}</strong>
            </p>
            <p className="metaItem">
              <span>{content.ui.uploadedOriginalSizeLabel}</span>
              <strong>{selectedFile ? formatBytes(selectedFile.size) : content.ui.noFileText}</strong>
            </p>
            <p className="metaItem">
              <span>{content.ui.selectedTargetLabel}</span>
              <strong>{targetSizePreview}</strong>
            </p>
            <p className="metaItem">
              <span>{content.ui.allowedRangeLabel}</span>
              <strong>{formatCompressionRange()}</strong>
            </p>
            <p className="metaItem">
              <span>{content.ui.allowedTargetRangeLabel}</span>
              <strong>{targetSizeBoundsText}</strong>
            </p>
          </div>

          <p className={`status ${errorMessage.length > 0 ? 'statusError' : 'statusInfo'}`}>{statusText}</p>

          {errorMessage.length > 0 ? <p className="errorMessage">{errorMessage}</p> : null}

          <div className="actions">
            <button className="button primaryButton" type={content.html.buttonTypeSubmit} aria-label={content.aria.submitButton} disabled={isLoading}>
              {isLoading ? content.ui.submitLoading : content.ui.submitIdle}
            </button>
            <button className="button secondaryButton" type={content.html.buttonTypeButton} aria-label={content.aria.resetButton} onClick={handleReset} disabled={isLoading}>
              {content.ui.resetButton}
            </button>
          </div>
        </form>

        {isResultReady ? (
          <section className="result">
            <h2 className="resultTitle">{content.ui.resultTitle}</h2>
            <div className="resultGrid">
              <p className="metaItem">
                <span>{content.ui.originalSizeLabel}</span>
                <strong>{formatBytes(originalSize)}</strong>
              </p>
              <p className="metaItem">
                <span>{content.ui.compressedSizeLabel}</span>
                <strong>{formatBytes(compressedSize)}</strong>
              </p>
              <p className="metaItem">
                <span>{content.ui.savedSizeLabel}</span>
                <strong>{formatSavedBytes(originalSize, compressedSize)}</strong>
              </p>
              <p className="metaItem">
                <span>{content.ui.compressionPercentageLabel}</span>
                <strong>{formatSavedPercent(originalSize, compressedSize)}</strong>
              </p>
              <p className="metaItem">
                <span>{content.ui.requestedTargetSizeLabel}</span>
                <strong>{formatBytes(requestedTargetSizeBytes)}</strong>
              </p>
            </div>

            {requestedTargetSizeBytes > 0 ? (
              <p className={`targetStatus ${targetAchieved ? 'targetStatusOk' : 'targetStatusWarning'}`}>
                {targetAchieved ? content.ui.targetReached : content.ui.targetNotReached}
              </p>
            ) : null}

            <a className="button primaryButton" href={downloadUrl} download={content.file.outputFallbackName} aria-label={content.aria.downloadButton}>
              {content.ui.downloadButton}
            </a>
          </section>
        ) : null}
      </section>
    </main>
  );
}
