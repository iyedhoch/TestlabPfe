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

// ==================== Story Images ====================

export class CreateStoryImageDto {
  caption: string;      // Required: user-provided or filename fallback
  altText?: string;     // Optional: accessibility
}

export class UpdateStoryImageDto {
  caption?: string;     // Update caption
  altText?: string;     // Update alt text
  order?: number;       // Reorder images
}

export class StoryImagesMutationDto {
  add?: Array<{          // New images to upload
    fileBuffer: Buffer;
    caption: string;
    altText?: string;
  }>;
  update?: Record<string, UpdateStoryImageDto>;  // Update existing by ID
  remove?: string[];     // Image IDs to delete
  reorder?: Array<{      // Reorder all images
    id: string;
    order: number;
  }>;
}

// ==================== User Stories ====================

export class CreateUserStoryDto {
  name: string;
  featureId: string;
  priority?: StoryPriority;
  status?: StoryStatus;
  description?: string;
  tagId?: string;
  fileBuffer?: Buffer;            // Legacy: single attachment upload
  fileBuffers?: Buffer[];         // New: multiple attachment uploads
  storyImages?: StoryImagesMutationDto; // New: multi-image with metadata
}

export class UpdateUserStoryDto extends CreateUserStoryDto {
  attachment: string | null;      // Legacy: for backward compatibility
  removeAttachment?: boolean;     // Explicit removal flag from frontend
}

export class CreateTagDto {
  label: string;
  color: string;
}

export class UpdateTagDto {
  label?: string;
  color?: string;
}
