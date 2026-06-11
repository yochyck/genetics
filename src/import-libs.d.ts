declare module 'pdfjs-dist' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(input: { data: ArrayBuffer }): { promise: Promise<{ numPages: number; getPage(pageNumber: number): Promise<{ getTextContent(): Promise<{ items: Array<{ str?: string }> }> }> }> };
}
declare module 'mammoth/mammoth.browser' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
}
