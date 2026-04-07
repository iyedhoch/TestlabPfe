export interface DocumentGenerator {
  generateHtmlDocument(
    projectId: number,
    template?: string,
    userId?: number,
  ): string;
  generatePdfDocument(
    projectId: number,
    template?: string,
    userId?: number,
    mode?: string,
    documentType?: 'cahier' | 'fsd',
  ): Promise<Buffer>;
  generateWordDocument(
    projectId: number,
    template?: string,
    userId?: number,
    documentType?: 'cahier' | 'fsd',
  ): Promise<Buffer>;
  generateExcelDocument(
    projectId: number,
    template?: string,
    userId?: number,
  ): Promise<Buffer>;
}
