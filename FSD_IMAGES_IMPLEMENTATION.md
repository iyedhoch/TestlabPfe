# FSD Images with Cloudinary - Implementation Complete ✅

**Status**: Backend implementation complete. Ready for frontend UI and database migration.

**Timeline**: 6 phases implemented, 2 phases (frontend) pending.

---

## What Was Implemented

### 1. Prisma Data Model (Phase 1) ✅
**File**: [testlab-backend/prisma/schema.prisma](testlab-backend/prisma/schema.prisma)

New `FsdUserStoryImage` model:
```prisma
model FsdUserStoryImage {
  id                  String    @id @default(uuid())
  userStoryId         String
  userStory           UserStory @relation(fields: [userStoryId], references: [id], onDelete: Cascade)

  url                 String    // Cloudinary secure_url
  cloudinaryPublicId  String?   // For deletion from Cloudinary
  caption             String    @default("")
  altText             String?   // For accessibility
  order               Int       @default(0)

  createdAt           DateTime  @default(now())
  updatedAt           DateTime? @updatedAt

  @@index([userStoryId, order])
  @@map("fsd_user_story_images")
}
```

Added relation to `UserStory`: `fsdImages FsdUserStoryImage[]`

**Key Features**:
- Stores multiple images per user story
- Tracks Cloudinary public_id for safe deletion
- Order field for image sequence
- Caption and alt text with defaults
- Timestamps for audit trail

---

### 2. API DTOs (Phase 2) ✅
**File**: [testlab-backend/src/specification/spec.dto.ts](testlab-backend/src/specification/spec.dto.ts)

**New DTOs**:

```typescript
export class CreateStoryImageDto {
  caption: string;      // Required: user-provided
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
```

**Extended DTOs**:
- `CreateUserStoryDto.storyImages?: StoryImagesMutationDto`
- `UpdateUserStoryDto.storyImages?: StoryImagesMutationDto`

**Backward Compatibility**:
- `CreateUserStoryDto.fileBuffer` still works for legacy single attachment
- `UpdateUserStoryDto.attachment` field preserved

---

### 3. Service Layer (Phase 3) ✅
**File**: [testlab-backend/src/specification/spec.service.ts](testlab-backend/src/specification/spec.service.ts)

**New Helper Methods**:

1. **`uploadAndStoreStoryImages(userStoryId, files)`**
   - Uploads file buffers to Cloudinary
   - Creates FsdUserStoryImage records with order tracking
   - Returns stored image objects with urls and public_ids

2. **`deleteStoryImage(imageId)`**
   - Deletes image from database
   - Calls Cloudinary delete using public_id
   - Handles errors gracefully (logs warnings if asset missing)

3. **`handleStoryImageMutations(userStoryId, mutations)`**
   - Processes `add`: uploads new files via uploadAndStoreStoryImages
   - Processes `update`: modifies caption, altText, order for existing images
   - Processes `remove`: deletes images via deleteStoryImage
   - Processes `reorder`: updates order field for reordering

**Updated Methods**:
- `createUserStory()`: calls handleStoryImageMutations if storyImages provided
- `updateUserStory()`: calls handleStoryImageMutations if storyImages provided

**Backward Compatibility**:
- Legacy `fileBuffer` upload still works
- Existing `attachment` field preserved

---

### 4. Document Generation (Phase 4) ✅
**File**: [testlab-backend/src/documents/services/document-data.service.ts](testlab-backend/src/documents/services/document-data.service.ts)

**Changes**:

1. **Updated `queryFsdProject()`**
   - Added `fsdImages` include to userStories query
   - Ordered by `[{ order: 'asc' }, { createdAt: 'asc' }]`
   - Only loaded when `withStoryRelations: true`

2. **Added `buildStoryImagesArray(story)` helper**
   - Converts `FsdUserStoryImage` records to `FsdUserStory.images[]` format
   - Maps: `{ url, alt: altText, caption }`
   - **Legacy fallback**: If no images but story has attachment, creates single image from attachment

3. **Added `applyGlobalFigureNumbering(epics)` helper**
   - Traverses all epics → features → stories
   - Assigns sequential `figureNumber` (1, 2, 3...)
   - Sets `figureTitle` as "Figure N"
   - Applies globally across entire document

4. **Updated `getFsdData()` story mapping**
   - Calls `buildStoryImagesArray(story)` for each story
   - Applies global figure numbering after building epics

**Figure Numbering Logic**:
```
Epic 1, Feature 1, Story 1:
  - Image 1 → Figure 1
  - Image 2 → Figure 2
Epic 1, Feature 2, Story 1:
  - Image 1 → Figure 3
  - Image 2 → Figure 4
...etc (global sequential across entire FSD)
```

---

### 5. Template Verification (Phase 5 & 6) ✅

**PDF Template** ([testlab-backend/src/documents/templates/pdf/fsd/fsd-fr-v5.hbs](testlab-backend/src/documents/templates/pdf/fsd/fsd-fr-v5.hbs)):
- ✅ Already has image rendering code
- Iterates `story.images` with `{{#each}}`
- Renders: `<img src="{{url}}" alt="{{alt}}" />`
- Caption: `<p>Figure {{figureNumber}} : {{caption}}</p>`
- Styling: `.us-image-container`, `.us-image`, `.us-figure-caption`

**Word Template** ([testlab-backend/src/documents/generators/word-template.generator.ts](testlab-backend/src/documents/generators/word-template.generator.ts)):
- ✅ Already preprocesses images (line 305)
- Maps `story.images` to template format
- Sets `figureNumber` and `figureTitle`
- Uses global number from document-data.service as primary

---

## What's Needed Next

### A. Database Migration (CRITICAL)
Create a new Prisma migration:
```bash
cd testlab-backend
npx prisma migrate dev --name add_fsd_user_story_images
```

This creates the `fsd_user_story_images` table.

### B. Frontend UI (Phase 7)

#### ManualStoryModal/UserStoryMutationModal
- Add multi-image upload component
- Show current images with captions
- Allow add/remove/reorder operations
- Call spec API with `storyImages: { add, remove, reorder }`

#### DocumentPreviewPage
- Show story images with captions in preview
- Add inline caption editing
- Save caption edits to DocumentVersion

### C. Testing & Validation (Phase 8)

**Test Scenarios**:
1. ✅ Create story with 2 images + captions
2. ✅ Update: change only caption
3. ✅ Update: replace one image
4. ✅ Update: reorder images
5. ✅ Update: remove image (verify Cloudinary cleanup)
6. ✅ Export FSD PDF → verify images + global figure numbers
7. ✅ Export FSD Word → verify images + global figure numbers
8. ✅ Legacy story with old attachment still renders as Figure
9. ✅ Edit caption in preview → save → re-download → caption persists

---

## API Usage Examples

### Create Story with Images
```bash
POST /api/story/create
{
  "name": "User can upload profile photo",
  "featureId": "...",
  "description": "...",
  "storyImages": {
    "add": [
      {
        "fileBuffer": <Buffer>,
        "caption": "Upload interface mockup",
        "altText": "Photo upload form"
      },
      {
        "fileBuffer": <Buffer>,
        "caption": "Success confirmation screen",
        "altText": "Upload complete"
      }
    ]
  }
}
```

### Update Story: Change Caption + Remove Image
```bash
PATCH /api/story/:id
{
  "storyImages": {
    "update": {
      "image-id-123": {
        "caption": "Updated: New caption text"
      }
    },
    "remove": ["image-id-456"]
  }
}
```

### Update Story: Reorder Images
```bash
PATCH /api/story/:id
{
  "storyImages": {
    "reorder": [
      { "id": "image-1", "order": 0 },
      { "id": "image-3", "order": 1 },
      { "id": "image-2", "order": 2 }
    ]
  }
}
```

---

## FSD Document Output

### PDF Example
```
6.1.1.1 User can upload profile photo

[Image renders here with border]
Figure 1: Upload interface mockup

Détails de la User Story
Description: ...

Critères d'acceptation
...
```

### Word Example
Same structure, preprocessed for Word template merge.

---

## Data Flow Summary

```
Frontend Upload
    ↓
API: spec.controller → spec.service.createUserStory()
    ↓
uploadAndStoreStoryImages()
    ├→ CloudinaryService.uploadBufferToCloudinary()
    ├→ prisma.fsdUserStoryImage.create() × N
    └→ Return image records
    
When Generating FSD Document:
    ↓
document-data.service.getFsdData()
    ├→ queryFsdProject() [includes fsdImages]
    ├→ buildStoryImagesArray() [for each story]
    ├→ applyGlobalFigureNumbering() [Figure 1, 2, 3...]
    └→ FsdDocumentModel with story.images[]
    
Template Rendering:
    ├→ PDF: fsd-fr-v5.hbs [renders images + captions]
    └→ Word: word-template.generator.ts [maps images]
```

---

## Cloudinary Configuration

Ensure these env vars are set in `.env`:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=testlab_preset
```

The implementation reuses existing Cloudinary wiring in `spec.service`.

---

## Backward Compatibility

✅ **Old stories with single attachment still work**:
- `buildStoryImagesArray()` fallback creates image from `story.attachment`
- Legacy `fileBuffer` upload path still functional
- Existing documents render old attachments as Figure 1

✅ **Can migrate gradually**:
- Old attachments render fine alongside new multi-image stories
- No migration script needed
- New stories use new structure automatically

---

## Summary

| Component | Status | Files |
|-----------|--------|-------|
| Prisma Model | ✅ | schema.prisma |
| DTOs | ✅ | spec.dto.ts |
| Service Layer | ✅ | spec.service.ts |
| Document Generation | ✅ | document-data.service.ts |
| PDF Template | ✅ | fsd-fr-v5.hbs |
| Word Template | ✅ | word-template.generator.ts |
| Database Migration | ⏳ | Run `prisma migrate dev` |
| Frontend UI | ⏳ | UserStoryModals, DocumentPreview |
| Testing | ⏳ | Test cases |

**Next Step**: Run database migration, then implement frontend UI components.
