export interface IGetEpicsPayload {
  projectId: string;
}

export interface IDeleteEpicPayload {
  id: string;
}

export interface ICreateEpicPayload {
  name: string;
  description: string;
  status: EpicStatus;
  priority: EpicPriority;
  projectId: string;
}

export interface IUpdateEpicPayload {
  name: string;
  description: string;
  tagId?: string | null;
  status: EpicStatus;
  priority: EpicPriority;
  epicId: string;
}

export interface IEpic {
  id: string;
  name: string;
  description: string;
  creationDate: Date;
  status: EpicStatus;
  priority: EpicPriority;
  tag?: ITag;
  projectId: string;
  features: IFeature[];
}

export interface IFeature {
  id: string;
  name: string;
  description: string;
  creationDate: Date;
  status: FeatureStatus;
  priority: FeaturePriority;
  tag?: ITag;
  userStories: IUserStory[];
  epicId: string;
}

export interface ICreateFeaturePayload {
  name: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  epicId: string;
}

export interface IUpdateFeaturePayload {
  featureId: string;
  name: string;
  description: string;
  tagId?: string | null;
  status: FeatureStatus;
  priority: FeaturePriority;
}

export interface IDeleteFeaturePayload {
  id: string;
}

export interface IUserStory {
  id: string;
  name: string;
  description: string;
  priority: StoryPriority;
  status: StoryStatus;
  creationDate: Date;
  tag?: ITag;
  featureId: string;
  attachment?: string | null;
  fsdImages?: IUserStoryImage[];
  testCases: any[];
}

export interface IUserStoryImage {
  id?: string;
  url: string;
  altText?: string | null;
  caption?: string | null;
  order?: number;
}

export interface ICreateUserStoryPayload {
  name: string;
  description: string;
  priority: StoryPriority;
  status: StoryStatus;
  featureId: string;
  attachment?: File | null;
  attachments?: File[];
  captions?: string[];
}

export interface IUpdateUserStoryPayload {
  storyId: string;
  name?: string;
  description?: string;
  status?: StoryStatus;
  priority?: StoryPriority;
  tagId?: string;
  // Keep these original fields
  attachment?: string | null;          // legacy attachment URL
  fsdImages?: IUserStoryImage[];      // existing images (in updateData)
  // New fields you already added
  attachments?: File[];           
  removeAttachment?: boolean;     
  captions?: string[];            
  imageCaptions?: { id: string; caption: string }[];
  imageIdsToDelete?: string[];
}

export interface IDeleteUserStoryPayload {
  id: string;
}

export interface ITag {
  id: string;
  label: string;
  color: string;
}

export interface IImportFromClickupPayload {
  clickupApiToken: string;
  listId: string;
  withFilters?: boolean;
}

export enum EpicPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum EpicStatus {
  NEW = "NEW",
  COMPLETED = "COMPLETED",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING = "PENDING",
}

export enum FeaturePriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum FeatureStatus {
  NEW = "NEW",
  COMPLETED = "COMPLETED",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING = "PENDING",
}

export enum StoryPriority {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export enum StoryStatus {
  TO_DO = "TO_DO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  BLOCKED = "BLOCKED",
}

export interface IClickupList {
  id: string;
  name: string;
  tasks: IClickupTask[];
}

export interface IClickupTask {
  id: string;
  custom_id: string | null;
  custom_item_id: number;
  name: string;
  text_content: string | null;
  description: string | null;
  status: ITaskStatus;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  date_done: string | null;
  archived: boolean;
  creator: ITaskUser;
  assignees: ITaskUser[];
  group_assignees: any[];
  watchers: ITaskUser[];
  checklists: any[];
  tags: ITaskTag[];
  parent: string | null;
  top_level_parent: string | null;
  priority: ITaskPriority | null;
  due_date: string | null;
  start_date: string | null;
  points: number | null;
  time_estimate: number | null;
  time_spent?: number;
  custom_fields: ICustomField[];
  dependencies: any[];
  linked_tasks: any[];
  locations: any[];
  team_id: string;
  task_type: IClickupTaskType;
  url: string;
  sharing: ISharingSettings;
  permission_level: string;
  list: ITaskListReference;
  project: IProjectReference;
  folder: IFolderReference;
  space: ISpaceReference;
  children: IClickupTask[];
}

interface Avatar {
  source: string;
  value: string;
}

export interface IClickupTaskType {
  id: number;
  name: string;
  name_plural: string;
  description: string | null;
  avatar: Avatar;
}

export interface ITaskStatus {
  status: string;
  id: string;
  color: string;
  type: string;
  orderindex: number;
}

export interface ITaskUser {
  id: number;
  username: string;
  color: string;
  email: string;
  profilePicture: string | null;
  initials?: string;
}

export interface ITaskTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator: number;
}

export interface ITaskPriority {
  color: string;
  id: string;
  orderindex: string;
  priority: string;
}

export interface ICustomField {
  id: string;
  name: string;
  type: string;
  type_config: ITypeConfig;
  date_created: string;
  hide_from_guests: boolean;
  required: boolean;
  value?: string | null;
  value_richtext?: string | null;
}

export interface ITypeConfig {
  simple?: boolean;
  formula?: string;
  version?: string;
  reset_at?: number;
  is_dynamic?: boolean;
  return_types?: string[];
  calculation_state?: string;
  [key: string]: any;
}

export interface ISharingSettings {
  public: boolean;
  public_share_expires_on: string | null;
  public_fields: string[];
  token: string | null;
  seo_optimized: boolean;
}

export interface ITaskListReference {
  id: string;
  name: string;
  access: boolean;
}

export interface IProjectReference {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}

export interface IFolderReference {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}

export interface ISpaceReference {
  id: string;
}

export interface IClickupTaskDetails {
  id: string;
  name: string;
  description: string | null;
  text_content: string | null;

  status: ITaskStatus;
  priority: ITaskPriority | null;

  due_date: string | null;
  start_date: string | null;

  date_created: string;
  date_updated: string;
  date_closed: string | null;
  date_done: string | null;

  archived: boolean;

  creator: ITaskUser;
  assignees: ITaskUser[];
  watchers: ITaskUser[];

  tags: ITaskTag[];

  parent: string | null;

  custom_fields: ICustomField[];

  dependencies: any[];
  linked_tasks: any[];

  attachments: IClickupAttachment[];

  url: string;

  list: IClickupLocationRef;
  folder: IClickupLocationRef;
  space: IClickupLocationRef;

  time_estimate: number | null;
  time_spent: number;

  points: number | null;
}

export interface IClickupAttachment {
  id: string;
  title: string;
  version: number;
  date: string;
  extension: string;
  thumbnail_medium: string | null;
  thumbnail_small: string | null;
  thumbnail_large: string | null;
  url: string;
}

export interface IClickupLocationRef {
  id: string;
  name: string;
  access: boolean;
}

export interface IClickupProject {
  projectId: string;
  projectName: string;
  backlogListId: string;
  backlogListName: string;
  spaceId: string;
  spaceName: string;
  teamId: string;
  teamName: string;
}
