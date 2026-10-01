/**
 * Legacy react-pdf viewer — not used in the app bundle.
 * PdfViewer uses the browser iframe preview instead (Next.js + pdfjs-dist compat).
 */
export type { PdfViewerProps as PdfDocumentViewerProps } from "@/components/pdf/pdf-viewer";
export { PdfViewer as PdfDocumentViewer } from "@/components/pdf/pdf-viewer";
