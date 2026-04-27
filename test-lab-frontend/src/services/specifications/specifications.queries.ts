import { useMutation, useQuery } from "@tanstack/react-query";
import {
  IClickupList,
  IClickupProject,
  IClickupTaskDetails,
  ICreateEpicPayload,
  ICreateFeaturePayload,
  ICreateUserStoryPayload,
  IDeleteEpicPayload,
  IDeleteFeaturePayload,
  IDeleteUserStoryPayload,
  IEpic,
  IGetEpicsPayload,
  IImportFromClickupPayload,
  ITag,
  IUpdateEpicPayload,
  IUpdateFeaturePayload,
  IUpdateUserStoryPayload,
} from "./specifications.types";
import {
  CREATE_EPIC,
  CREATE_FEATURE,
  CREATE_STORY,
  CREATE_TAG,
  DELETE_EPIC,
  DELETE_FEATURE,
  DELETE_STORY,
  DELETE_TAG,
  GET_CLICKUP_PROJECTS,
  GET_CLICKUP_TASK,
  GET_EPICS,
  GET_TAGS,
  IMPORT_FROM_CLICKUP,
  SPECIFICATIONS_QUERIES_PREFIX,
  UPDATE_EPIC,
  UPDATE_FEATURE,
  UPDATE_STORY,
  UPDATE_TAG,
} from "./specifications.constants";
import { api } from "@/api";
import { IProject } from "../projects";

export function useGetEpicsByProjectIdQuery(payload: IGetEpicsPayload) {
  return useQuery<IEpic[]>({
    queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS, payload?.projectId],
    queryFn: async () => {
      const response = await api.get(`/api/specs/${payload?.projectId}`);
      return response.data;
    },
    enabled: !!payload?.projectId,
  });
}

export function useDeleteEpicByIdMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, DELETE_EPIC],
    mutationFn: async (payload: IDeleteEpicPayload) => {
      const response = await api.delete(
        `/api/specs/delete-epic/${payload?.id}`
      );
      return response.data;
    },
  });
}

export function useCreateEpicMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, CREATE_EPIC],
    mutationFn: async (payload: ICreateEpicPayload) => {
      const response = await api.post("/api/specs/create-epic", payload);
      return response.data;
    },
  });
}

export function useUpdateEpicMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, UPDATE_EPIC],
    mutationFn: async (payload: IUpdateEpicPayload) => {
      const response = await api.put(
        `/api/specs/update-epic/${payload?.epicId}`,
        payload
      );
      return response.data;
    },
  });
}

export function useCreateFeatureMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, CREATE_FEATURE],
    mutationFn: async (payload: ICreateFeaturePayload) => {
      const response = await api.post("/api/specs/create-feature", payload);
      return response.data;
    },
  });
}

export function useUpdateFeatureMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, UPDATE_FEATURE],
    mutationFn: async (payload: IUpdateFeaturePayload) => {
      const response = await api.put(
        `/api/specs/update-feature/${payload?.featureId}`,
        payload
      );
      return response.data;
    },
  });
}

export function useDeleteFeatureByIdMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, DELETE_FEATURE],
    mutationFn: async (payload: IDeleteFeaturePayload) => {
      const response = await api.delete(
        `/api/specs/delete-feature/${payload?.id}`
      );
      return response.data;
    },
  });
}

export function useCreateUserStoryMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, CREATE_STORY],
    mutationFn: async (payload: ICreateUserStoryPayload) => {
      const formData = new FormData();

      formData.append("name", payload?.name);
      formData.append("description", payload?.description);
      formData.append("priority", payload?.priority);
      formData.append("status", payload?.status);
      formData.append("featureId", payload?.featureId);

      if (payload?.attachment) {
        formData.append("attachment", payload?.attachment);
      }

      const response = await api.post("/api/specs/create-story", formData);
      return response.data;
    },
  });
}

export function useUpdateUserStoryMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, UPDATE_STORY],
    mutationFn: async (payload: IUpdateUserStoryPayload) => {
      const formData = new FormData();

      formData.append("name", payload?.name);
      formData.append("description", payload?.description);
      formData.append("priority", payload?.priority);
      formData.append("status", payload?.status);
      formData.append("storyId", payload?.storyId);

      // Only append attachment if it's a File (new upload)
      if (payload?.attachment instanceof File) {
        formData.append("attachment", payload.attachment);
      }

      // Only append tagId if defined
      if (payload?.tagId) {
        formData.append("tagId", payload.tagId);
      }

      // Signal explicit removal when attachment is null
      if (payload?.attachment === null && payload?.removeAttachment) {
        formData.append("removeAttachment", "true");
      }

      const response = await api.put(
        `/api/specs/update-story/${payload?.storyId}`,
        formData
      );
      return response.data;
    },
  });
}

export function useDeleteUserStoryByIdMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, DELETE_STORY],
    mutationFn: async (payload: IDeleteUserStoryPayload) => {
      const response = await api.delete(
        `/api/specs/delete-story/${payload?.id}`
      );
      return response.data;
    },
  });
}

export const useGetAllTagsQuery = () => {
  return useQuery<ITag[]>({
    queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_TAGS],
    queryFn: async () => {
      const response = await api.get(`/api/specs/tags`);
      return response.data;
    },
  });
};

export const useGetTagByIdQuery = (id: number, enabled: boolean = true) => {
  return useQuery<ITag>({
    queryKey: [SPECIFICATIONS_QUERIES_PREFIX, id],
    queryFn: async () => {
      const { data } = await api.get(`/api/specs/tags/${id}`);
      return data;
    },
    enabled,
  });
};

export const useCreateTagMutation = () => {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, CREATE_TAG],
    mutationFn: async (tag: Omit<ITag, "id">) => {
      const { data } = await api.post(`/api/specs/tags`, tag);
      return data;
    },
  });
};

export const useUpdateTagMutation = () => {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, UPDATE_TAG],
    mutationFn: async ({
      id,
      ...tagData
    }: {
      id: number;
      label?: string;
      color?: string;
    }) => {
      const { data } = await api.put(`/api/specs/tags/${id}`, tagData);
      return data;
    },
  });
};

export const useDeleteTagMutation = () => {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, DELETE_TAG],
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/specs/tags/${id}`);
      return data;
    },
  });
};

export function useImportFromClickupQuery(
  payload: IImportFromClickupPayload,
  enabled: boolean = true,
  selectedProject: IProject
) {
  return useQuery({
    queryKey: [
      SPECIFICATIONS_QUERIES_PREFIX,
      IMPORT_FROM_CLICKUP,
      payload?.listId,
      selectedProject?.id,
    ],
    queryFn: async () => {
      const response = await api.post("/api/specs/clickup-import", payload);
      return response.data as IClickupList[];
    },
    enabled: enabled && !!payload?.listId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useImportFromClickupMutation() {
  return useMutation({
    mutationKey: [SPECIFICATIONS_QUERIES_PREFIX, IMPORT_FROM_CLICKUP],
    mutationFn: async (payload: IImportFromClickupPayload) => {
      const response = await api.post("/api/specs/clickup-import", payload);
      return response.data as IClickupList[];
    },
  });
}

export const useGetClickupTaskDetailsQuery = (
  taskId: string,
  clickupApiToken: string,
  isEnabled: boolean = false
) => {
  return useQuery<IClickupTaskDetails>({
    queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_CLICKUP_TASK, taskId],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/specs/clickup-task/${taskId}?clickupApiToken=${clickupApiToken}`
      );
      return data;
    },
    enabled: isEnabled,
  });
};

export const useGetClickupProjectsQuery = (clickupApiToken: string) => {
  return useQuery<IClickupProject[]>({
    queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_CLICKUP_PROJECTS],
    queryFn: async () => {
      const { data } = await api.post(`/api/specs/clickup-projects`, {
        clickupApiToken,
      });
      return data;
    },
  });
};
