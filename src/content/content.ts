export const content = {
  metadata: {
    language: 'id',
    title: 'Compress PDF',
    description: 'Kompres file PDF dengan cepat menggunakan mode standar (lossless) atau agresif (lossy).'
  },
  urls: {
    compressApi: '/api/compress'
  },
  http: {
    postMethod: 'POST',
    noStoreCache: 'no-store'
  },
  response: {
    attachmentDisposition: 'attachment',
    filenameDirective: 'filename',
    errorKey: 'error',
    booleanTrue: 'true',
    booleanFalse: 'false'
  },
  html: {
    inputTypeFile: 'file',
    inputTypeNumber: 'number',
    buttonTypeSubmit: 'submit',
    buttonTypeButton: 'button'
  },
  form: {
    fieldNames: {
      file: 'pdfFile',
      targetSizeValue: 'targetSizeValue',
      targetSizeUnit: 'targetSizeUnit',
      compressionMode: 'compressionMode'
    },
    accept: '.pdf,application/pdf',
    targetSizeDefaultValue: '0',
    targetSizeMinValue: '0',
    targetSizeStepValues: {
      kb: '0.1',
      mb: '0.1'
    },
    targetSizeUnit: {
      defaultValue: 'mb',
      kilobytesValue: 'kb',
      megabytesValue: 'mb'
    },
    compressionMode: {
      defaultValue: 'aggressive',
      standardValue: 'standard',
      aggressiveValue: 'aggressive'
    }
  },
  file: {
    extension: '.pdf',
    outputFallbackName: 'compressed.pdf',
    bytesPerMegabyte: 1024 * 1024
  },
  mimeTypes: {
    pdf: 'application/pdf',
    octetStream: 'application/octet-stream',
    json: 'application/json'
  },
  headers: {
    contentType: 'Content-Type',
    contentDisposition: 'Content-Disposition',
    cacheControl: 'Cache-Control',
    originalSize: 'X-Original-Size',
    compressedSize: 'X-Compressed-Size',
    requestedTargetSizeBytes: 'X-Requested-Target-Size-Bytes',
    targetAchieved: 'X-Target-Achieved'
  },
  virtualFs: {
    root: '/',
    inputPrefix: 'input',
    outputPrefix: 'output',
    tokenSeparator: '-'
  },
  compression: {
    minPercent: 20,
    maxPercent: 90,
    profiles: [
      {
        args: ['--compression-level=3']
      },
      {
        args: ['--compression-level=6', '--object-streams=generate']
      },
      {
        args: ['--compression-level=9', '--object-streams=generate', '--normalize-content=y']
      },
      {
        args: ['--compression-level=9', '--object-streams=generate', '--normalize-content=y', '--optimize-images']
      }
    ],
    baseArgs: ['--compress-streams=y', '--stream-data=compress', '--recompress-flate']
  },
  ui: {
    pageTitle: 'Compress PDF',
    pageDescription: 'Unggah PDF, pilih mode kompresi, tentukan ukuran hasil, lalu unduh hasilnya.',
    fileInputLabel: 'File PDF',
    targetSizeLabel: 'Target Ukuran Hasil',
    compressionModeLabel: 'Mode Kompresi',
    compressionModeHint: 'Mode Agresif menurunkan kualitas gambar agar ukuran file lebih kecil.',
    compressionModeStandard: 'Standar (Lossless)',
    compressionModeAggressive: 'Agresif (Lossy)',
    targetUnitLabel: 'Satuan Ukuran Target',
    targetSizeHint: 'Pilih satuan KB atau MB lalu isi ukuran file hasil dalam rentang yang valid.',
    allowedRangeLabel: 'Rentang Kompres Valid',
    submitIdle: 'Kompres PDF',
    submitLoading: 'Sedang Memproses',
    resetButton: 'Reset',
    resultTitle: 'Hasil Kompresi',
    downloadButton: 'Download PDF',
    originalSizeLabel: 'Ukuran Asli',
    compressedSizeLabel: 'Ukuran Hasil',
    savedSizeLabel: 'Penghematan',
    compressionPercentageLabel: 'Persentase Kompres',
    requestedTargetSizeLabel: 'Target Ukuran Hasil',
    selectedFileLabel: 'File Terpilih',
    uploadedOriginalSizeLabel: 'Ukuran PDF Asli Upload',
    selectedTargetLabel: 'Target Saat Ini',
    allowedTargetRangeLabel: 'Rentang Target Valid',
    statusReady: 'Siap dikompres',
    statusSuccess: 'Kompresi selesai',
    statusError: 'Terjadi kesalahan',
    noFileText: 'Belum ada file dipilih.',
    targetReached: 'Target ukuran hasil tercapai.',
    targetNotReached: 'Target ukuran hasil belum tercapai, hasil terbaik yang tersedia telah diberikan.',
    noReductionWarning: 'PDF tidak bisa diperkecil lagi dengan metode kompresi saat ini. File hasil tetap sama dengan file asli.',
    lossyModeApplied: 'Mode Agresif dipakai. Beberapa halaman bisa terlihat lebih blur karena kualitas gambar diturunkan.',
    lossyModeNoGain: 'Mode Agresif sudah dicoba, tetapi browser tidak menghasilkan ukuran yang lebih kecil dari file asli.',
    lossyModeFailed: 'Mode Agresif gagal diproses di browser ini. Silakan coba browser lain atau gunakan mode Standar.'
  },
  errors: {
    fileMissing: 'File PDF wajib diunggah.',
    invalidType: 'Tipe file tidak didukung. Gunakan file PDF.',
    invalidExtension: 'Ekstensi file harus .pdf.',
    invalidTargetSize: 'Target ukuran hasil tidak valid.',
    processingLimitReached: 'Server cloud mencapai batas resource. Coba target ukuran lebih besar atau gunakan PDF yang lebih kecil.',
    compressionFailed: 'Gagal memproses kompresi PDF.',
    unknown: 'Terjadi kesalahan yang tidak diketahui.'
  },
  aria: {
    fileInput: 'Unggah file PDF',
    targetSizeInput: 'Masukkan target ukuran hasil',
    targetUnitSelect: 'Pilih satuan target ukuran hasil',
    compressionModeSelect: 'Pilih mode kompresi PDF',
    submitButton: 'Proses kompresi PDF',
    resetButton: 'Reset form kompresi',
    downloadButton: 'Unduh hasil PDF terkompresi'
  },
  formats: {
    bytesUnit: 'B',
    kilobytesUnit: 'KB',
    megabytesUnit: 'MB',
    percentUnit: '%'
  }
} as const;
