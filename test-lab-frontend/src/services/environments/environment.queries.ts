import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CREATE_ENVIRONMENT,
  DELETE_ENVIRONMENT,
  GET_PAGINATED_ENVIRONMENTS,
  ENVIRONMENT_QUERIES_PREFIX,
  UPDATE_ENVIRONMENT,
} from "./environment.constants";
import { api } from "@/api";
import {
  ICreateEnvironmentPayload,
  IDeleteEnvironmentPayload,
  IEnvironment,
  IUpdateEnvironmentPayload,
} from "./environment.types";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { IPaginatedResponse } from "../projects";

export function useGetPaginatedEnvironmentsQuery(
  projectId: string | number,
  page: number = 1,
  size: number = DEFAULT_PAGE_SIZE
) {
  return useQuery<IPaginatedResponse<IEnvironment>>({
    queryKey: [
      ENVIRONMENT_QUERIES_PREFIX,
      GET_PAGINATED_ENVIRONMENTS,
      page,
      projectId,
    ],
    queryFn: async () => {
      const response = await api.get(
        `/api/environments/paginated?page=${page}&limit=${size}&projectId=${projectId}`
      );
      return response.data;
    },
    enabled: !!projectId && projectId !== 1,
  });
}

export function useCreateEnvironmentMutation() {
  return useMutation({
    mutationKey: [ENVIRONMENT_QUERIES_PREFIX, CREATE_ENVIRONMENT],
    mutationFn: async (payload: ICreateEnvironmentPayload) => {
      const response = await api.post("/api/environments", payload);
      return response.data;
    },
  });
}

export function useUpdateEnvironmentMutation() {
  return useMutation({
    mutationKey: [ENVIRONMENT_QUERIES_PREFIX, UPDATE_ENVIRONMENT],
    mutationFn: async (payload: IUpdateEnvironmentPayload) => {
      const response = await api.put(
        `/api/environments/${payload?.id}`,
        payload
      );
      return response.data;
    },
  });
}

export function useDeleteEnvironmentMutation() {
  return useMutation({
    mutationKey: [ENVIRONMENT_QUERIES_PREFIX, DELETE_ENVIRONMENT],
    mutationFn: async (payload: IDeleteEnvironmentPayload) => {
      const response = await api.delete(`/api/environments/${payload?.id}`);
      return response.data;
    },
  });
}
