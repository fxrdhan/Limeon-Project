type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

type RenderedPdfPreviewCanvas = {
  canvas: HTMLCanvasElement;
  pageCount: number;
};

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;
const MAX_CLIENT_PDF_PREVIEW_BYTES = 10 * 1024 * 1024;

const loadPdfJsModule = async () => {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
    ]).then(([pdfjsLib, pdfWorkerModule]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;
      return pdfjsLib;
    });
  }

  return pdfJsModulePromise;
};

const renderPdfPreviewCanvas = async (
  file: Blob,
  targetWidth: number,
): Promise<RenderedPdfPreviewCanvas | null> => {
  if (file.size > MAX_CLIENT_PDF_PREVIEW_BYTES) {
    return null;
  }

  const pdfjsLib = await loadPdfJsModule();
  let pdfDocument: {
    numPages: number;
    getPage: (pageNumber: number) => Promise<any>;
    cleanup: () => void;
    destroy: () => void;
  } | null = null;

  try {
    const fileBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(fileBuffer));
    const loadedPdfDocument = await loadingTask.promise;
    pdfDocument = loadedPdfDocument;

    const firstPage = await loadedPdfDocument.getPage(1);
    const baseViewport = firstPage.getViewport({ scale: 1 });
    const scale = targetWidth / Math.max(baseViewport.width, 1);
    const viewport = firstPage.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    await firstPage.render({
      canvas,
      canvasContext: context,
      viewport,
      background: "rgb(255, 255, 255)",
    }).promise;

    return {
      canvas,
      pageCount: Math.max(loadedPdfDocument.numPages ?? 1, 1),
    };
  } finally {
    pdfDocument?.cleanup();
    pdfDocument?.destroy();
  }
};

export const renderPdfPreviewDataUrl = async (file: Blob, targetWidth: number) => {
  const renderedPreview = await renderPdfPreviewCanvas(file, targetWidth);
  if (!renderedPreview) return null;

  return {
    coverDataUrl: renderedPreview.canvas.toDataURL("image/png"),
    pageCount: renderedPreview.pageCount,
  };
};

export const renderPdfPreviewBlob = async (file: Blob, targetWidth: number) => {
  const renderedPreview = await renderPdfPreviewCanvas(file, targetWidth);
  if (!renderedPreview) return null;

  const coverBlob = await new Promise<Blob | null>((resolve) => {
    renderedPreview.canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/png");
  });
  if (!coverBlob) return null;

  return {
    coverBlob,
    pageCount: renderedPreview.pageCount,
  };
};
