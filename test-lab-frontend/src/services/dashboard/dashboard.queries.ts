import { useQuery } from "@tanstack/react-query";
import {
  DASHBOARD_QUERIES_PREFIX,
  GET_DASHBOARD_DATA,
} from "./dashboard.constants";
import { api } from "@/api";
import { IDashboardResponse } from "./dashboard.types";

export function useGetDashboardData() {
  return useQuery<IDashboardResponse>({
    queryKey: [DASHBOARD_QUERIES_PREFIX, GET_DASHBOARD_DATA],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/data");
      return response.data;
    },
  });
}
