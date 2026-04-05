export interface ClickUpTask {
  id: string;
  name: string;
  parent: string | null;
  custom_item_id?: number;
  task_type?: ClickUpTaskType | null;
  [key: string]: any;
}

export interface ClickUpTaskType {
  id: number;
  name: string;
  [key: string]: any;
}

export interface TaskNode extends ClickUpTask {
  children: TaskNode[];
}

export interface ProcessedList {
  id: string;
  name: string;
  tasks: ClickUpTask[];
}

export interface ClickUpProject {
  projectId: string | null;
  projectName: string | null;
  backlogListId: string;
  backlogListName: string;
  spaceId: string;
  spaceName: string;
  teamId: string;
  teamName: string;
  isFolderless?: boolean;
}
