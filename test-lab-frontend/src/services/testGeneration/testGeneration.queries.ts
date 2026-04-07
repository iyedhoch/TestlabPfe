import { api } from "@/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CREATE_TEST_CASE,
  CREATE_TEST_STEP,
  CREATE_TEST_SUITE,
  DELETE_TEST_STEP,
  GET_TEST_CASE,
  GET_TEST_SUITES,
  MOVE_TEST_CASE,
  MOVE_TEST_SUITE,
  REORDER_TEST_STEPS,
  TEST_GENERATION_QUERIES_PREFIX,
  UPDATE_PRECONDITION,
  UPDATE_TEST_STEP,
} from "./testGeneration.constants";
import {
  ICreateTestCasePayload,
  ICreateTestStepPayload,
  ICreateTestSuitePayload,
  IGetTestSuitesPayload,
  IMoveTestCasePayload,
  IMoveTestSuitePayload,
  IReorderTestStepsPayload,
  IReorderTestSuites,
  ITestCase,
  ITestSuite,
  IUpdatePreconditionPayload,
  IUpdateTestCasePayload,
  IUpdateTestStepPayload,
  IUpdateTestSuitePayload,
} from "./testGeneration.types";

//? test suites queries / mutations

export function useGetTestSuitesByProjectIdQuery(
  payload: IGetTestSuitesPayload
) {
  return useQuery<ITestSuite[]>({
    queryKey: [
      TEST_GENERATION_QUERIES_PREFIX,
      GET_TEST_SUITES,
      payload?.projectId,
    ],
    queryFn: async () => {
      const response = await api.get(
        `/api/test-generation/test-suites?projectId=${payload?.projectId}`
      );
      return response.data;
    },
    enabled: !!payload?.projectId,
  });
}

export function useCreateTestSuiteMutation() {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, CREATE_TEST_SUITE],
    mutationFn: async (payload: ICreateTestSuitePayload) => {
      const response = await api.post(
        "/api/test-generation/test-suites",
        payload
      );
      return response.data;
    },
  });
}

export const useUpdateTestSuiteMutation = () => {
  return useMutation({
    mutationFn: async (payload: IUpdateTestSuitePayload) => {
      const { id, ...data } = payload;

      const response = await api.put(
        `/api/test-generation/test-suites/${id}`,
        data
      );
      return response.data;
    },
  });
};

export const useDeleteTestSuiteMutation = () => {
  return useMutation({
    mutationFn: async (suiteId: string) => {
      const response = await api.delete(
        `/api/test-generation/test-suites/${suiteId}`
      );
      return response.data;
    },
  });
};

export const useReorderTestSuitesMutation = () => {
  return useMutation({
    mutationFn: async (payload: IReorderTestSuites) => {
      const { projectId, suites } = payload;

      const response = await api.put(
        `/api/test-generation/reorder-suites/${projectId}`,
        {
          suites,
        }
      );
      return response.data;
    },
  });
};

export const useMoveTestSuiteMutation = () => {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, MOVE_TEST_SUITE],
    mutationFn: async (payload: IMoveTestSuitePayload) => {
      const response = await api.put(
        `/api/test-generation/test-suites/move`,
        payload
      );
      return response.data;
    },
  });
};

//? test cases queries / mutations

export function useGetTestCaseByIdQuery(id?: string) {
  return useQuery<ITestCase>({
    queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_CASE, id],
    queryFn: async () => {
      const response = await api.get(`/api/test-generation/test-cases/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateTestCaseMutation() {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, CREATE_TEST_CASE],
    mutationFn: async (payload: ICreateTestCasePayload) => {
      const response = await api.post(
        "/api/test-generation/test-cases",
        payload
      );
      return response.data;
    },
  });
}

export function useDeleteTestCaseMutation() {
  return useMutation({
    mutationFn: async (testCaseId: string) => {
      const response = await api.delete(
        `/api/test-generation/test-cases/${testCaseId}`
      );
      return response.data;
    },
  });
}

export function useUpdateTestCaseMutation() {
  return useMutation({
    mutationFn: async (payload: IUpdateTestCasePayload) => {
      const { id, ...data } = payload;
      const response = await api.put(
        `/api/test-generation/test-cases/${id}`,
        data
      );
      return response.data;
    },
  });
}

export const useMoveTestCaseMutation = () => {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, MOVE_TEST_CASE],
    mutationFn: async (payload: IMoveTestCasePayload) => {
      const response = await api.put(
        `/api/test-generation/test-cases/move`,
        payload
      );
      return response.data;
    },
  });
};

//? test steps queries / mutations

export function useDeleteTestStepMutation() {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, DELETE_TEST_STEP],
    mutationFn: async (testStepId: string) => {
      const response = await api.delete(
        `/api/test-generation/test-steps/${testStepId}`
      );
      return response.data;
    },
  });
}

export function useUpdateTestStepMutation() {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, UPDATE_TEST_STEP],
    mutationFn: async (payload: IUpdateTestStepPayload) => {
      const response = await api.put(
        `/api/test-generation/test-steps/${payload?.id}`,
        payload
      );
      return response.data;
    },
  });
}

export function useReorderTestStepsMutation() {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, REORDER_TEST_STEPS],
    mutationFn: async (payload: IReorderTestStepsPayload) => {
      const response = await api.put(
        `/api/test-generation/reorder-steps/${payload?.testCaseId}`,
        payload
      );
      return response.data;
    },
  });
}

export const useCreateTestStepMutation = () => {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, CREATE_TEST_STEP],
    mutationFn: async (payload: ICreateTestStepPayload) => {
      const response = await api.post(
        "/api/test-generation/test-steps",
        payload
      );
      return response.data;
    },
  });
};

//? preconditions queries / mutations

export const useUpdatePreconditionMutation = () => {
  return useMutation({
    mutationKey: [TEST_GENERATION_QUERIES_PREFIX, UPDATE_PRECONDITION],
    mutationFn: async (payload: IUpdatePreconditionPayload) => {
      const response = await api.put(
        `/api/test-generation/preconditions/${payload?.id}`,
        payload
      );
      return response.data;
    },
  });
};
