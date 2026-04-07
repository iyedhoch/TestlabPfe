export interface IProject {
  id: string;
  name: string;
  description: string;
  prefix: string;
  creationDate: Date;
  status: ProjectStatus;
  figmaLink: string;
  attachment?: string;
}

export interface ICreateProjectPayload {
  name: string;
  description: string;
  prefix: string;
  status: ProjectStatus;
  figmaLink: string;
  attachment: File | null;
}

export interface IUpdateProjectPayload {
  id: string;
  name: string;
  description: string;
  prefix: string;
  status: ProjectStatus;
  figmaLink: string;
  attachment: File | null | string; // string only when passing to Project component
}

export interface IDeleteProjectPayload {
  id: string;
}

export interface IExportProjectsPayload {
  projectIds: string[];
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  ARCHIVED = "ARCHIVED",
  COMPLETED = "COMPLETED",
}
