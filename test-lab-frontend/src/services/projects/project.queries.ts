import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CREATE_PROJECT,
  DELETE_PROJECT,
  EXPORT_PROJECTS,
  GET_PAGINATED_PROJECTS,
  GET_PROJECTS,
  PROJECT_QUERIES_PREFIX,
  UPDATE_PROJECT,
} from "./project.constants";
import { api } from "@/api";
import {
  ICreateProjectPayload,
  IDeleteProjectPayload,
  IExportProjectsPayload,
  IPaginatedResponse,
  IProject,
  IUpdateProjectPayload,
} from "./project.types";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";

export function useGetProjectsQuery() {
  return useQuery<IProject[]>({
    queryKey: [PROJECT_QUERIES_PREFIX, GET_PROJECTS],
    queryFn: async () => {
      const response = await api.get(`/api/projects`);
      return response.data;
    },
  });
}

export function useGetPaginatedProjectsQuery(
  page: number = 1,
  size: number = DEFAULT_PAGE_SIZE
) {
  return useQuery<IPaginatedResponse<IProject>>({
    queryKey: [PROJECT_QUERIES_PREFIX, GET_PAGINATED_PROJECTS, page],
    queryFn: async () => {
      const response = await api.get(
        `/api/projects/paginated?page=${page}&limit=${size}`
      );
      return response.data;
    },
  });
}

export function useCreateProjectMutation() {
  return useMutation({
    mutationKey: [PROJECT_QUERIES_PREFIX, CREATE_PROJECT],
    mutationFn: async (payload: ICreateProjectPayload) => {
      const formData = new FormData();

      formData.append("name", payload?.name);
      formData.append("description", payload?.description);
      formData.append("prefix", payload?.prefix);
      formData.append("status", payload?.status);
      formData.append("figmaLink", payload?.figmaLink);

      if (payload?.attachment) {
        formData.append("attachment", payload?.attachment);
      }

      const response = await api.post("/api/projects", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
  });
}

export function useUpdateProjectMutation() {
  return useMutation({
    mutationKey: [PROJECT_QUERIES_PREFIX, UPDATE_PROJECT],
    mutationFn: async (payload: IUpdateProjectPayload) => {
      const formData = new FormData();

      formData.append("name", payload?.name);
      formData.append("description", payload?.description);
      formData.append("prefix", payload?.prefix);
      formData.append("status", payload?.status);
      formData.append("figmaLink", payload?.figmaLink);

      if (payload?.attachment) {
        formData.append("attachment", payload?.attachment);
      }

      const response = await api.put(`/api/projects/${payload?.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
  });
}

export function useDeleteProjectMutation() {
  return useMutation({
    mutationKey: [PROJECT_QUERIES_PREFIX, DELETE_PROJECT],
    mutationFn: async (payload: IDeleteProjectPayload) => {
      const response = await api.delete(`/api/projects/${payload?.id}`);
      return response.data;
    },
  });
}

export function useExportProjectsMutation() {
  return useMutation({
    mutationKey: [PROJECT_QUERIES_PREFIX, EXPORT_PROJECTS],
    mutationFn: async (payload: IExportProjectsPayload) => {
      const response = await api.post(`/api/projects/export`, payload, {
        responseType: "blob", // Important: tell axios to expect binary data
      });

      const blob = new Blob([response.data], { type: "application/pdf" });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `projects-export-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response.data;
    },
  });
}
