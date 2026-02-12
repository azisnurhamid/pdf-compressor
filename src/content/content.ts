export const content = {
  metadata: {
    language: 'id',
    title: 'Compress PDF',
    description: 'Kompres file PDF dengan cepat tanpa mengubah teks menjadi gambar.'
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
      targetSizeUnit: 'targetSizeUnit'
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
      }
    ],
    baseArgs: ['--compress-streams=y', '--stream-data=compress', '--recompress-flate']
  },
  ui: {
    pageTitle: 'Compress PDF',
    pageDescription: 'Unggah PDF, pilih satuan KB atau MB, tentukan ukuran akhir, lalu unduh hasilnya.',
    fileInputLabel: 'File PDF',
    targetSizeLabel: 'Target Ukuran Akhir',
    targetUnitLabel: 'Satuan Ukuran Target',
    targetSizeHint: 'Pilih satuan KB atau MB lalu isi ukuran file akhir dalam rentang yang valid.',
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
    requestedTargetSizeLabel: 'Target Ukuran Akhir',
    selectedFileLabel: 'File Terpilih',
    uploadedOriginalSizeLabel: 'Ukuran PDF Asli Upload',
    selectedTargetLabel: 'Target Saat Ini',
    allowedTargetRangeLabel: 'Rentang Target Valid',
    statusReady: 'Siap dikompres',
    statusSuccess: 'Kompresi selesai',
    statusError: 'Terjadi kesalahan',
    noFileText: 'Belum ada file dipilih.',
    targetReached: 'Target ukuran akhir tercapai.',
    targetNotReached: 'Target ukuran akhir belum tercapai, hasil terbaik yang tersedia telah diberikan.'
  },
  errors: {
    fileMissing: 'File PDF wajib diunggah.',
    invalidType: 'Tipe file tidak didukung. Gunakan file PDF.',
    invalidExtension: 'Ekstensi file harus .pdf.',
    invalidTargetSize: 'Target ukuran akhir tidak valid.',
    processingLimitReached: 'Server cloud mencapai batas resource. Coba target ukuran lebih besar atau gunakan PDF yang lebih kecil.',
    compressionFailed: 'Gagal memproses kompresi PDF.',
    unknown: 'Terjadi kesalahan yang tidak diketahui.'
  },
  aria: {
    fileInput: 'Unggah file PDF',
    targetSizeInput: 'Masukkan target ukuran akhir',
    targetUnitSelect: 'Pilih satuan target ukuran akhir',
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
