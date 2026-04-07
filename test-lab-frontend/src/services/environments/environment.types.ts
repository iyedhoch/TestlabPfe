// EnvItem interfaces
export interface IEnvItem {
  id: string;
  environmentKey: string;
  value: string;
  environmentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnvItemInput {
  key: string;
  value: string;
}

// Environment interfaces
export interface IEnvironment {
  id: string;
  name: string;
  url: string;
  description: string;
  status: string;
  projectId: string;
  envItems?: IEnvItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateEnvironmentPayload {
  name: string;
  url: string;
  description?: string;
  status?: string;
  projectId: string;
  envItems?: IEnvItemInput[];
}

export interface IUpdateEnvironmentPayload {
  id: string;
  name?: string;
  url?: string;
  description?: string;
  status?: string;
  envItems?: IEnvItemInput[];
}

export interface IDeleteEnvironmentPayload {
  id: string;
}

// Pagination response
export interface IPaginatedEnvironmentsResponse {
  data: IEnvironment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Query parameters
export interface IGetEnvironmentsQueryParams {
  page?: number;
  limit?: number;
  projectId?: string;
}
