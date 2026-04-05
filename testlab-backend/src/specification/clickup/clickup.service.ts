import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import {
  ClickUpTask,
  ClickUpTaskType,
  ClickUpProject,
  ProcessedList,
  TaskNode,
} from './clickup.interfaces';

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';
const ALLOWED_TASK_TYPES = ['epic', 'feature', 'user story'];
const ALLOWED_NAME_TAGS = ['[epic]', '[feature]', '[us]'];
const MAX_CONCURRENT_PAGES = 25;

@Injectable()
export class ClickUpService {
  constructor() {}

  // ─── Public Methods ────────────────────────────────────────────────────────

  async importFromClickup(
    clickupApiToken: string,
    spaceId?: string,
    folderId?: string,
    listId?: string,
    withFilters = false,
  ): Promise<Array<{ id: string; name: string; tasks: TaskNode[] }>> {
    this.validateImportParams(clickupApiToken, spaceId, folderId, listId);

    const headers = this.buildHeaders(clickupApiToken);

    const taskTypesMap = await this.fetchTaskTypesMap(
      spaceId ?? null,
      folderId ?? null,
      listId ?? null,
      headers,
    );

    const lists = await this.resolveBacklogLists(
      spaceId,
      folderId,
      listId,
      headers,
    );

    if (!lists.length) {
      throw new NotFoundException(
        'No Backlog lists found in the specified location',
      );
    }

    const processedLists = await Promise.all(
      lists.map((list) =>
        this.processList(list, headers, taskTypesMap, withFilters),
      ),
    );

    return processedLists.map(({ id, name, tasks }) => ({
      id,
      name,
      tasks: this.buildTaskHierarchy(tasks),
    }));
  }

  async getAllProjects(clickupApiToken: string): Promise<ClickUpProject[]> {
    const headers = this.buildHeaders(clickupApiToken);
    const teams = await this.fetchTeams(headers);

    if (!teams.length) {
      return [];
    }

    const allProjects: ClickUpProject[] = [];
    const processedFolderIds = new Set<string>();

    for (const team of teams) {
      const teamProjects = await this.collectProjectsForTeam(
        team,
        headers,
        processedFolderIds,
      );
      allProjects.push(...teamProjects);
    }

    return allProjects;
  }

  async getTaskDetails(clickupApiToken: string, taskId: string) {
    if (!clickupApiToken)
      throw new BadRequestException('ClickUp API token is required');
    if (!taskId) throw new BadRequestException('Task ID is required');

    const headers = this.buildHeaders(clickupApiToken);
    const task = await this.fetchTask(taskId, headers);

    return this.formatTaskDetails(task);
  }

  // ─── Validation & Setup ───────────────────────────────────────────────────

  private validateImportParams(
    token: string,
    spaceId?: string,
    folderId?: string,
    listId?: string,
  ): void {
    if (!token) throw new BadRequestException('ClickUp API token is required');
    if (!spaceId && !folderId && !listId) {
      throw new BadRequestException(
        'Either spaceId, folderId, or listId is required',
      );
    }
  }

  private buildHeaders(token: string): Record<string, string> {
    return { Authorization: token, 'Content-Type': 'application/json' };
  }

  // ─── List Resolution ──────────────────────────────────────────────────────

  private async resolveBacklogLists(
    spaceId?: string,
    folderId?: string,
    listId?: string,
    headers?: Record<string, string>,
  ): Promise<Array<{ id: string; name: string }>> {
    if (listId) return this.resolveListId(listId, headers!);
    if (folderId) return this.resolveFolder(folderId, headers!);
    if (spaceId) return this.resolveSpace(spaceId, headers!);
    return [];
  }

  private async resolveListId(
    listId: string,
    headers: Record<string, string>,
  ): Promise<Array<{ id: string; name: string }>> {
    const { data } = await this.get(`/list/${listId}`, headers);
    if (!this.isBacklog(data.name)) {
      throw new BadRequestException('The specified list is not a Backlog list');
    }
    return [{ id: data.id, name: data.name }];
  }

  private async resolveFolder(
    folderId: string,
    headers: Record<string, string>,
  ): Promise<Array<{ id: string; name: string }>> {
    const { data } = await this.get(`/folder/${folderId}`, headers);
    return data.lists
      .filter((l: any) => this.isBacklog(l.name))
      .map((l: any) => ({ id: l.id, name: l.name }));
  }

  private async resolveSpace(
    spaceId: string,
    headers: Record<string, string>,
  ): Promise<Array<{ id: string; name: string }>> {
    const lists: Array<{ id: string; name: string }> = [];

    const [spaceData, foldersData] = await Promise.all([
      this.get(`/space/${spaceId}`, headers).then((r) => r.data),
      this.get(`/space/${spaceId}/folder`, headers).then((r) => r.data),
    ]);

    const spaceLists = (spaceData.lists ?? [])
      .filter((l: any) => this.isBacklog(l.name))
      .map((l: any) => ({ id: l.id, name: l.name }));

    const folderLists = (foldersData.folders ?? []).flatMap((folder: any) =>
      (folder.lists ?? [])
        .filter((l: any) => this.isBacklog(l.name))
        .map((l: any) => ({ id: l.id, name: l.name })),
    );

    lists.push(...spaceLists, ...folderLists);
    return lists;
  }

  // ─── Task Fetching ────────────────────────────────────────────────────────

  private async fetchAllTasksFromList(
    listId: string,
    headers: Record<string, string>,
  ): Promise<ClickUpTask[]> {
    const baseParams = {
      archived: false,
      include_closed: true,
      subtasks: true,
    };

    const firstPage = await this.get(`/list/${listId}/task`, headers, {
      ...baseParams,
      page: 0,
    });
    const allTasks: ClickUpTask[] = firstPage.data.tasks ?? [];

    if (allTasks.length < 100) return allTasks;

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const pageNumbers = Array.from(
        { length: MAX_CONCURRENT_PAGES },
        (_, i) => page + i,
      );

      const responses = await Promise.all(
        pageNumbers.map((p) =>
          this.get(`/list/${listId}/task`, headers, {
            ...baseParams,
            page: p,
          }).catch(() => ({ data: { tasks: [] } })),
        ),
      );

      let foundPartialPage = false;
      for (const res of responses) {
        const tasks: ClickUpTask[] = res.data.tasks ?? [];
        allTasks.push(...tasks);
        if (tasks.length < 100) {
          hasMore = false;
          foundPartialPage = true;
          break;
        }
      }

      if (!foundPartialPage) {
        page += MAX_CONCURRENT_PAGES;
      }
    }

    return allTasks;
  }

  private async fetchSubtasksForParents(
    tasks: ClickUpTask[],
    listId: string,
    headers: Record<string, string>,
  ): Promise<ClickUpTask[]> {
    const existingTaskIds = new Set(tasks.map((t) => t.id));

    // on ne récupère que les tâches racines
    const parentTasks = tasks.filter((t) => t.parent === null);

    const subtaskPromises = parentTasks.map(async (task) => {
      try {
        const { data } = await this.get(`/list/${listId}/task`, headers, {
          parent: task.id,
          subtasks: true,
          archived: false,
          include_closed: true,
        });

        return data.tasks ?? [];
      } catch (error: any) {
        console.error(
          `Error fetching subtasks for task ${task.id}:`,
          error?.response?.data ?? error?.message,
        );
        return [];
      }
    });

    const subtaskArrays = await Promise.all(subtaskPromises);
    const allSubtasks = subtaskArrays.flat();

    // éviter les doublons
    const newSubtasks = allSubtasks.filter((st) => !existingTaskIds.has(st.id));

    return [...tasks, ...newSubtasks];
  }

  private async fetchTask(
    taskId: string,
    headers: Record<string, string>,
  ): Promise<any> {
    const { data } = await this.get(`/task/${taskId}`, headers, {
      include_subtasks: true,
    });
    return data;
  }

  private async fetchTeams(headers: Record<string, string>): Promise<any[]> {
    const { data } = await this.get('/team', headers);
    return data.teams ?? [];
  }

  // ─── Task Types ───────────────────────────────────────────────────────────

  private async fetchTaskTypesMap(
    spaceId: string | null,
    folderId: string | null,
    listId: string | null,
    headers: Record<string, string>,
  ): Promise<Record<number, ClickUpTaskType>> {
    const teamId = await this.resolveTeamId(spaceId, folderId, listId, headers);
    if (!teamId) return {};
    return this.fetchTaskTypesForTeam(teamId, headers);
  }

  private async fetchTaskTypesForTeam(
    teamId: string,
    headers: Record<string, string>,
  ): Promise<Record<number, ClickUpTaskType>> {
    try {
      const { data } = await this.get(`/team/${teamId}/custom_item`, headers);
      return Object.fromEntries(
        (data.custom_items ?? []).map((item: ClickUpTaskType) => [
          item.id,
          item,
        ]),
      );
    } catch {
      return {};
    }
  }

  private async resolveTeamId(
    spaceId: string | null,
    folderId: string | null,
    listId: string | null,
    headers: Record<string, string>,
  ): Promise<string | null> {
    try {
      if (listId) {
        const { data } = await this.get(`/list/${listId}`, headers);
        return data?.space?.id ?? null;
      }
      if (folderId) {
        const { data } = await this.get(`/folder/${folderId}`, headers);
        return data?.space?.id ?? null;
      }
      return spaceId;
    } catch {
      return null;
    }
  }

  // ─── Task Enrichment & Filtering ─────────────────────────────────────────

  private enrichTasksWithTypes(
    tasks: ClickUpTask[],
    typesMap: Record<number, ClickUpTaskType>,
  ): ClickUpTask[] {
    return tasks.map((task) => ({
      ...task,
      task_type: task.custom_item_id
        ? (typesMap[task.custom_item_id] ?? null)
        : null,
    }));
  }

  private filterTasksByType(tasks: ClickUpTask[]): ClickUpTask[] {
    return tasks.filter((task) => {
      if (!task.task_type?.name) {
        const name = task.name?.toLowerCase() ?? '';
        return ALLOWED_NAME_TAGS.some((tag) => name.includes(tag));
      }

      const typeName = task.task_type.name.toLowerCase();
      console.log('typeName', typeName);
      return ALLOWED_TASK_TYPES.some((allowed) => typeName.includes(allowed));
    });
  }

  // ─── List Processing ──────────────────────────────────────────────────────

  private async processList(
    list: { id: string; name: string },
    headers: Record<string, string>,
    taskTypesMap: Record<number, ClickUpTaskType>,
    withFilters: boolean,
  ): Promise<ProcessedList> {
    let tasks = await this.fetchAllTasksFromList(list.id, headers);
    tasks = await this.fetchSubtasksForParents(tasks, list.id, headers);

    if (Object.keys(taskTypesMap).length) {
      tasks = this.enrichTasksWithTypes(tasks, taskTypesMap);
      if (withFilters) tasks = this.filterTasksByType(tasks);
    }

    return { id: list.id, name: list.name, tasks };
  }

  // ─── Hierarchy Builder ────────────────────────────────────────────────────

  private buildTaskHierarchy(tasks: ClickUpTask[]): TaskNode[] {
    const nodeMap = new Map<string, TaskNode>(
      tasks.map((task) => [task.id, { ...task, children: [] }]),
    );
    const roots: TaskNode[] = [];

    for (const task of tasks) {
      const node = nodeMap.get(task.id)!;
      const parent = task.parent ? nodeMap.get(task.parent) : null;

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // ─── Project Collection ───────────────────────────────────────────────────

  private async collectProjectsForTeam(
    team: any,
    headers: Record<string, string>,
    processedIds: Set<string>,
  ): Promise<ClickUpProject[]> {
    const projects: ClickUpProject[] = [];

    try {
      const { data: spacesData } = await this.get(
        `/team/${team.id}/space`,
        headers,
        { archived: false },
      );

      for (const space of spacesData.spaces ?? []) {
        const spaceProjects = await this.collectProjectsForSpace(
          space,
          team,
          headers,
          processedIds,
        );
        projects.push(...spaceProjects);
      }
    } catch {
      // Space access denied — skip
    }

    const sharedProjects = await this.collectSharedFolderProjects(
      team,
      headers,
      processedIds,
    );
    projects.push(...sharedProjects);

    return projects;
  }

  private async collectProjectsForSpace(
    space: any,
    team: any,
    headers: Record<string, string>,
    processedIds: Set<string>,
  ): Promise<ClickUpProject[]> {
    const projects: ClickUpProject[] = [];

    try {
      const [foldersData, listsData] = await Promise.all([
        this.get(`/space/${space.id}/folder`, headers).then((r) => r.data),
        this.get(`/space/${space.id}/list`, headers, { archived: false })
          .then((r) => r.data)
          .catch(() => ({ lists: [] })),
      ]);

      for (const folder of foldersData.folders ?? []) {
        const project = this.buildProjectFromFolder(
          folder,
          space,
          team,
          processedIds,
        );
        if (project) projects.push(project);
      }

      const backlog = this.findBacklogList(listsData.lists ?? []);
      if (backlog) {
        projects.push({
          projectId: null,
          projectName: null,
          backlogListId: backlog.id,
          backlogListName: backlog.name,
          spaceId: space.id,
          spaceName: space.name,
          teamId: team.id,
          teamName: team.name,
          isFolderless: true,
        });
      }
    } catch {
      // Folder access denied — skip
    }

    return projects;
  }

  private async collectSharedFolderProjects(
    team: any,
    headers: Record<string, string>,
    processedIds: Set<string>,
  ): Promise<ClickUpProject[]> {
    const projects: ClickUpProject[] = [];

    try {
      const { data } = await this.get(`/team/${team.id}/folder`, headers);

      await Promise.all(
        (data.folders ?? []).map(async (folder: any) => {
          try {
            const { data: folderData } = await this.get(
              `/folder/${folder.id}`,
              headers,
            );
            const project = this.buildProjectFromFolder(
              folderData,
              folderData.space ?? { id: null, name: 'Unknown Space' },
              team,
              processedIds,
            );
            if (project) projects.push(project);
          } catch {
            // Skip inaccessible folders
          }
        }),
      );
    } catch {
      // Team folders endpoint may not exist — skip
    }

    return projects;
  }

  private buildProjectFromFolder(
    folder: any,
    space: any,
    team: any,
    processedIds: Set<string>,
  ): ClickUpProject | null {
    if (processedIds.has(folder.id)) return null;

    const backlog = this.findBacklogList(folder.lists ?? []);
    if (!backlog) return null;

    processedIds.add(folder.id);

    return {
      projectId: folder.id,
      projectName: folder.name,
      backlogListId: backlog.id,
      backlogListName: backlog.name,
      spaceId: space.id,
      spaceName: space.name,
      teamId: team.id,
      teamName: team.name,
    };
  }

  // ─── Task Detail Formatter ────────────────────────────────────────────────

  private formatTaskDetails(task: any) {
    const fields = [
      'id',
      'name',
      'description',
      'text_content',
      'status',
      'priority',
      'due_date',
      'start_date',
      'date_created',
      'date_updated',
      'date_closed',
      'date_done',
      'archived',
      'creator',
      'assignees',
      'watchers',
      'tags',
      'parent',
      'custom_fields',
      'dependencies',
      'linked_tasks',
      'url',
      'list',
      'folder',
      'space',
      'project',
      'time_estimate',
      'time_spent',
      'points',
      'checklists',
    ] as const;

    return {
      ...Object.fromEntries(fields.map((f) => [f, task[f]])),
      attachments: task.attachments ?? [],
    };
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private isBacklog(name: string): boolean {
    return name?.toLowerCase().includes('backlog');
  }

  private findBacklogList(lists: any[]): any | undefined {
    return lists.find((l) => this.isBacklog(l.name));
  }

  private async get(
    path: string,
    headers: Record<string, string>,
    params?: Record<string, any>,
  ) {
    return await axios.get(`${CLICKUP_API_BASE}${path}`, { headers, params });
  }
}
