import { api } from "@/api";
import { useToast } from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { DOCUMENT_QUERIES_PREFIX, EXPORT_DOCUMENT } from "./document.constants";
import { IExportDocumentPayload } from "./document.types";

function buildDocumentEndpoint(payload: IExportDocumentPayload): string {
  if (payload.pathSuffix) {
    return `/api/documents/projects/${payload.projectId}/${payload.documentType}/${payload.pathSuffix}`;
  }

  const formatSegment =
    payload.documentType === "fsd" &&
    (payload.format === "pdf" || payload.format === "word") &&
    payload.language
      ? `${payload.format}-lang`
      : payload.format;

  const endpoint = `/api/documents/projects/${payload.projectId}/${payload.documentType}/${formatSegment}`;

  const params = new URLSearchParams();
  if (payload.language) {
    params.set("language", payload.language);
  }
  if (payload.mode) {
    params.set("mode", payload.mode);
  }

  const query = params.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

function getFallbackFileName(payload: IExportDocumentPayload): string {
  const extension = payload.format === "word" ? "docx" : payload.format;
  return `${payload.documentType}-${payload.projectId}-${Date.now()}.${extension}`;
}

function resolveDownloadFileName(
  dispositionHeader: string | undefined,
  payload: IExportDocumentPayload
): string {
  if (!dispositionHeader) {
    return getFallbackFileName(payload);
  }

  const match = dispositionHeader.match(/filename=\"?([^\";]+)\"?/i);
  if (match?.[1]) {
    return match[1];
  }

  return getFallbackFileName(payload);
}

export function useExportDocumentMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, EXPORT_DOCUMENT],
    mutationFn: async (payload: IExportDocumentPayload) => {
      const url = buildDocumentEndpoint(payload);
      const response = await api.get(url, { responseType: "blob" });

      const contentType = response.headers["content-type"];
      const fileName = resolveDownloadFileName(
        response.headers["content-disposition"],
        payload
      );

      const blob = new Blob([response.data], {
        type: contentType || "application/octet-stream",
      });

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      return response.data;
    },
    onSuccess: (_, payload) => {
      toast({
        title: "Export réussi",
        description: `Le document ${payload.documentType.toUpperCase()} (${payload.format.toUpperCase()}) a été téléchargé.`,
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      const description =
        error instanceof AxiosError && error.response?.status === 404
          ? "Le projet demandé est introuvable sur le serveur."
          : error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la génération du document.";

      toast({
        title: "Échec de l'export",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}
