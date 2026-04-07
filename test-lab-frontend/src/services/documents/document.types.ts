export type DocumentType = "cahier" | "fsd";
export type DocumentFormat = "pdf" | "word" | "excel";

export interface IExportDocumentPayload {
  projectId: string;
  documentType: DocumentType;
  format: DocumentFormat;
  language?: "en" | "fr";
  mode?: string;
  pathSuffix?: string;
}
