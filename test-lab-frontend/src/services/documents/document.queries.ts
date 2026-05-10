import { api } from "@/api";
import { useToast } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DELETE_DOCUMENT_VERSION,
  DOWNLOAD_DOCUMENT_VERSION,
  DOCUMENT_QUERIES_PREFIX,
  EXPORT_DOCUMENT,
  GENERATE_CAHIER,
  GENERATE_FSD,
  GET_DOCUMENT_PREVIEW_HTML,
  GET_DOCUMENT_VERSION,
  GET_CAHIER_SELECTION_SUITES,
  GET_FSD_SELECTION_EPICS,
  LIST_DOCUMENT_VERSIONS,
} from "./document.constants";
import {
  ICahierSelectionSuite,
  IDocumentVersionDetail,
  IDocumentVersionListItem,
  IDownloadDocumentVersionPayload,
  IExportDocumentPayload,
  IGetDocumentPreviewHtmlFromPayload,
  IFsdSelectionEpic,
  IGetDocumentPreviewHtmlPayload,
  IGenerateCahierPayload,
  IGenerateFsdPayload,
} from "./document.types";
import { getDocumentErrorMessage } from "@/utils/documents/error-normalizer";

type PayloadDocumentFormat = "pdf" | "word";

function buildFsdRequestBody(payload: IGenerateFsdPayload) {
  return {
    selectedEpicIds: payload.selectedEpicIds,
    selectedFeatureIds: payload.selectedFeatureIds,
    selectedUserStoryIds: payload.selectedUserStoryIds,
    title: payload.title,
    projectName: payload.projectName,
    clientName: payload.clientName,
    version: payload.version,
    date: payload.date,
    authors: payload.authors,
    author: payload.author,
    purpose: payload.purpose,
    projectOverview: payload.projectOverview,
    methodology: payload.methodology,
    approvals: payload.approvals,
    referenceDocuments: payload.referenceDocuments,
    glossary: payload.glossary,
    revisions: payload.revisions,
    editValues: payload.editValues,
    richEditValues: payload.richEditValues,
    sectionBackgroundValues: payload.sectionBackgroundValues,
    pageStyle: payload.pageStyle,
    language: payload.language,
    mode: payload.mode,
    status: payload.status,
    sourceVersionId: payload.sourceVersionId,
    threadId: payload.threadId,
    createdByName: payload.createdByName,
    excludedImageIds: payload.excludedImageIds,
  };
}

function buildCahierRequestBody(payload: IGenerateCahierPayload) {
  return {
    selectedSuiteIds: payload.selectedSuiteIds,
    selectedTestCaseIds: payload.selectedTestCaseIds,
    title: payload.title,
    projectName: payload.projectName,
    clientName: payload.clientName,
    version: payload.version,
    date: payload.date,
    authors: payload.authors,
    author: payload.author,
    description: payload.description,
    objective: payload.objective,
    projectOwner: payload.projectOwner,
    approvals: payload.approvals,
    editValues: payload.editValues,
    richEditValues: payload.richEditValues,
    sectionBackgroundValues: payload.sectionBackgroundValues,
    pageStyle: payload.pageStyle,
    language: payload.language,
    mode: payload.mode,
    status: payload.status,
    sourceVersionId: payload.sourceVersionId,
    threadId: payload.threadId,
    createdByName: payload.createdByName,
  };
}

function buildDocumentEndpoint(payload: IExportDocumentPayload): string {
  const normalizedFormat =
    (payload.format as unknown as string) === "odf" ? "word" : payload.format;

  if (payload.pathSuffix) {
    return `/api/documents/projects/${payload.projectId}/${payload.documentType}/${payload.pathSuffix}`;
  }

  const formatSegment =
    payload.documentType === "fsd" &&
    (normalizedFormat === "pdf" || normalizedFormat === "word") &&
    payload.language
      ? `${normalizedFormat}-lang`
      : normalizedFormat;

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
  const normalizedFormat =
    (payload.format as unknown as string) === "odf" ? "word" : payload.format;
  const extension = normalizedFormat === "word" ? "docx" : normalizedFormat;
  return `${payload.documentType}-${payload.projectId}-${Date.now()}.${extension}`;
}

function resolveDownloadFileName(
  dispositionHeader: string | undefined,
  payload: IExportDocumentPayload
): string {
  if (!dispositionHeader) {
    return getFallbackFileName(payload);
  }

  const encodedMatch = dispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      // Fall through to plain filename parsing.
    }
  }

  const quotedMatch = dispositionHeader.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = dispositionHeader.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return getFallbackFileName(payload);
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const objectUrl = window.URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }
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

      triggerBrowserDownload(blob, fileName);

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
      const description = getDocumentErrorMessage(error, "export");

      toast({
        title: "Échec de l'export",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useGetFsdSelectionEpicsQuery(
  projectId?: string,
  enabled: boolean = true
) {
  return useQuery<IFsdSelectionEpic[]>({
    queryKey: [DOCUMENT_QUERIES_PREFIX, GET_FSD_SELECTION_EPICS, projectId],
    enabled: Boolean(projectId) && enabled,
    queryFn: async () => {
      const response = await api.get(
        `/api/documents/projects/${projectId}/selection/fsd/epics`
      );
      return response.data;
    },
  });
}

export function useGetCahierSelectionSuitesQuery(
  projectId?: string,
  enabled: boolean = true
) {
  return useQuery<ICahierSelectionSuite[]>({
    queryKey: [DOCUMENT_QUERIES_PREFIX, GET_CAHIER_SELECTION_SUITES, projectId],
    enabled: Boolean(projectId) && enabled,
    queryFn: async () => {
      const response = await api.get(
        `/api/documents/projects/${projectId}/selection/cahier/suites`
      );
      return response.data;
    },
  });
}

export function useListDocumentVersionsQuery(
  projectId?: string,
  enabled: boolean = true,
  documentType?: "fsd" | "cahier"
) {
  return useQuery<IDocumentVersionListItem[]>({
    queryKey: [
      DOCUMENT_QUERIES_PREFIX,
      LIST_DOCUMENT_VERSIONS,
      projectId,
      documentType || "all",
    ],
    enabled: Boolean(projectId) && enabled,
    queryFn: async () => {
      const response = await api.get(`/api/documents/projects/${projectId}/versions`, {
        params: documentType ? { documentType } : undefined,
      });
      return response.data;
    },
  });
}

export function useGetDocumentVersionQuery(versionId?: string, enabled: boolean = true) {
  return useQuery<IDocumentVersionDetail>({
    queryKey: [DOCUMENT_QUERIES_PREFIX, GET_DOCUMENT_VERSION, versionId],
    enabled: Boolean(versionId) && enabled,
    queryFn: async () => {
      const response = await api.get(`/api/documents/versions/${versionId}`);
      return response.data;
    },
  });
}

export function useGetDocumentPreviewHtmlQuery(
  payload?: IGetDocumentPreviewHtmlPayload,
  enabled: boolean = true
) {
  return useQuery<string>({
    queryKey: [
      DOCUMENT_QUERIES_PREFIX,
      GET_DOCUMENT_PREVIEW_HTML,
      payload?.projectId,
      payload?.documentType,
      payload?.language,
      payload?.mode,
    ],
    enabled: Boolean(payload?.projectId && payload?.documentType) && enabled,
    queryFn: async () => {
      if (!payload) {
        return "";
      }

      const params = new URLSearchParams();
      if (payload.language) {
        params.set("language", payload.language);
      }
      if (payload.mode) {
        params.set("mode", payload.mode);
      }

      const basePath = `/api/documents/projects/${payload.projectId}/${payload.documentType}/preview/html`;
      const query = params.toString();
      const path = query ? `${basePath}?${query}` : basePath;

      const response = await api.get(path);
      return response.data?.html || "";
    },
  });
}

export function useGetDocumentPreviewHtmlFromPayloadMutation() {
  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, GET_DOCUMENT_PREVIEW_HTML, "payload"],
    mutationFn: async (payload: IGetDocumentPreviewHtmlFromPayload) => {
      const response = await api.post(
        `/api/documents/projects/${payload.projectId}/${payload.documentType}/preview/html`,
        payload.payload,
        {
          timeout: 30000,
        }
      );

      return response.data?.html || "";
    },
  });
}

export function useDeleteDocumentVersionMutation() {
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, DELETE_DOCUMENT_VERSION],
    mutationFn: async (versionId: string) => {
      const response = await api.delete(`/api/documents/versions/${versionId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [DOCUMENT_QUERIES_PREFIX, LIST_DOCUMENT_VERSIONS],
      });
      toast({
        title: "Version supprimée",
        description: "La version du document a été supprimée.",
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Suppression impossible",
        description: getDocumentErrorMessage(error, "load"),
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useDownloadDocumentVersionMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, DOWNLOAD_DOCUMENT_VERSION],
    mutationFn: async (payload: IDownloadDocumentVersionPayload) => {
      const response = await api.get(
        `/api/documents/versions/${payload.versionId}/download?format=${payload.format}`,
        {
          responseType: "blob",
          timeout: 0,
        }
      );

      const contentType = response.headers["content-type"];
      const fileName = resolveDownloadFileName(
        response.headers["content-disposition"],
        {
          projectId: "version-download",
          documentType: "fsd",
          format: payload.format,
        }
      );

      const blob = new Blob([response.data], {
        type: contentType || "application/octet-stream",
      });

      triggerBrowserDownload(blob, fileName);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Téléchargement lancé",
        description: "La version du document est en cours de téléchargement.",
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Échec du téléchargement",
        description: getDocumentErrorMessage(error, "download"),
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useGenerateFsdMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, GENERATE_FSD],
    mutationFn: async (payload: IGenerateFsdPayload) => {
      const response = await api.post(
        `/api/documents/projects/${payload.projectId}/fsd/pdf`,
        buildFsdRequestBody(payload),
        { responseType: "blob" }
      );

      return {
        data: response.data,
        headers: response.headers,
      };
    },
    onSuccess: (result, payload) => {
      const contentType = result.headers["content-type"];
      const fileName = resolveDownloadFileName(
        result.headers["content-disposition"],
        {
          projectId: payload.projectId,
          documentType: "fsd",
          format: "pdf",
        }
      );

      const blob = new Blob([result.data], {
        type: contentType || "application/pdf",
      });

      triggerBrowserDownload(blob, fileName);

      toast({
        title: "FSD généré",
        description: "Le document a été regénéré, sauvegardé et téléchargé.",
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      const description = getDocumentErrorMessage(error, "generate");

      toast({
        title: "Échec de la génération",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useGenerateFsdDocumentMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, GENERATE_FSD, "by-format"],
    mutationFn: async (input: {
      format: PayloadDocumentFormat;
      payload: IGenerateFsdPayload;
    }) => {
      const { format, payload } = input;
      const response = await api.post(
        `/api/documents/projects/${payload.projectId}/fsd/${format}`,
        buildFsdRequestBody(payload),
        { responseType: "blob" }
      );

      return {
        format,
        payload,
        data: response.data,
        headers: response.headers,
      };
    },
    onSuccess: ({ data, headers, payload, format }) => {
      const contentType = headers["content-type"];
      const fileName = resolveDownloadFileName(headers["content-disposition"], {
        projectId: payload.projectId,
        documentType: "fsd",
        format,
      });

      const blob = new Blob([data], {
        type: contentType || (format === "word" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf"),
      });

      triggerBrowserDownload(blob, fileName);

      toast({
        title: "FSD généré",
        description: `Le document ${format.toUpperCase()} a été regénéré, sauvegardé et téléchargé.`,
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      const description = getDocumentErrorMessage(error, "generate");

      toast({
        title: "Échec de la génération",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useSaveFsdMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, GENERATE_FSD, "save-only"],
    mutationFn: async (payload: IGenerateFsdPayload) => {
      await api.post(
        `/api/documents/projects/${payload.projectId}/fsd/save`,
        buildFsdRequestBody(payload)
      );
    },
    onSuccess: () => {
      toast({
        title: "FSD sauvegardé",
        description: "Les modifications ont été sauvegardées sans téléchargement.",
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      const description = getDocumentErrorMessage(error, "generate");

      toast({
        title: "Échec de la sauvegarde",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useGenerateCahierMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, GENERATE_CAHIER],
    mutationFn: async (payload: IGenerateCahierPayload) => {
      const response = await api.post(
        `/api/documents/projects/${payload.projectId}/cahier/pdf`,
        buildCahierRequestBody(payload),
        { responseType: "blob" }
      );

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Cahier généré",
        description: "Le document a été regénéré et sauvegardé.",
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      const description = getDocumentErrorMessage(error, "generate");

      toast({
        title: "Échec de la génération",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useGenerateCahierDocumentMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, GENERATE_CAHIER, "by-format"],
    mutationFn: async (input: {
      format: PayloadDocumentFormat;
      payload: IGenerateCahierPayload;
    }) => {
      const { format, payload } = input;
      const response = await api.post(
        `/api/documents/projects/${payload.projectId}/cahier/${format}`,
        buildCahierRequestBody(payload),
        { responseType: "blob" }
      );

      return {
        format,
        payload,
        data: response.data,
        headers: response.headers,
      };
    },
    onSuccess: ({ data, headers, payload, format }) => {
      const contentType = headers["content-type"];
      const fileName = resolveDownloadFileName(headers["content-disposition"], {
        projectId: payload.projectId,
        documentType: "cahier",
        format,
      });

      const blob = new Blob([data], {
        type: contentType || (format === "word" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf"),
      });

      triggerBrowserDownload(blob, fileName);

      toast({
        title: "Cahier généré",
        description: `Le document ${format.toUpperCase()} a été regénéré, sauvegardé et téléchargé.`,
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      const description = getDocumentErrorMessage(error, "generate");

      toast({
        title: "Échec de la génération",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}

export function useSaveCahierMutation() {
  const toast = useToast();

  return useMutation({
    mutationKey: [DOCUMENT_QUERIES_PREFIX, GENERATE_CAHIER, "save-only"],
    mutationFn: async (payload: IGenerateCahierPayload) => {
      await api.post(
        `/api/documents/projects/${payload.projectId}/cahier/save`,
        buildCahierRequestBody(payload)
      );
    },
    onSuccess: () => {
      toast({
        title: "Cahier sauvegardé",
        description: "Les modifications ont été sauvegardées sans téléchargement.",
        status: "success",
        duration: 3000,
      });
    },
    onError: (error) => {
      const description = getDocumentErrorMessage(error, "generate");

      toast({
        title: "Échec de la sauvegarde",
        description,
        status: "error",
        duration: 4000,
      });
    },
  });
}
