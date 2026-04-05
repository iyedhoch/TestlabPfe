import {
  FeaturePriority,
  FeatureStatus,
  StoryPriority,
  StoryStatus,
} from '_prisma/enums';

export class CreateFeatureDto {
  name: string;
  epicId: string;
  priority: FeaturePriority;
  status: FeatureStatus;
  description?: string;
  tagId?: string;
}

export class CreateEpicDto extends CreateFeatureDto {
  projectId: string;
}

export class CreateUserStoryDto {
  name: string;
  featureId: string;
  priority?: StoryPriority;
  status?: StoryStatus;
  description?: string;
  tagId?: string;
  fileBuffer?: Buffer;
}

export class UpdateUserStoryDto extends CreateUserStoryDto {
  attachment: string | null;
}

export class CreateTagDto {
  label: string;
  color: string;
}

export class UpdateTagDto {
  label?: string;
  color?: string;
}
