import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class FsdDefinitionInputDto {
  @IsString()
  term: string;

  @IsString()
  definition: string;
}

class FsdApprovalInputDto {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsString()
  date: string;
}

class FsdReferenceDocumentInputDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  attachment: string;
}

class FsdGlossaryInputDto {
  @IsString()
  term: string;

  @IsString()
  comment: string;
}

class FsdRevisionInputDto {
  @IsString()
  date: string;

  @IsString()
  version: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsString()
  author: string;
}

class FsdMetadataInputDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsString()
  author?: string;
}

export class GenerateFsdDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => FsdMetadataInputDto)
  metadata?: FsdMetadataInputDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedEpicIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedFeatureIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedUserStoryIds?: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  projectOverview?: string;

  @IsOptional()
  @IsString()
  methodology?: string;

  @IsOptional()
  @IsString()
  productPerspective?: string;

  @IsOptional()
  @IsString()
  userClasses?: string;

  @IsOptional()
  @IsString()
  assumptions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FsdDefinitionInputDto)
  definitions?: FsdDefinitionInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FsdApprovalInputDto)
  approvals?: FsdApprovalInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FsdReferenceDocumentInputDto)
  referenceDocuments?: FsdReferenceDocumentInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FsdGlossaryInputDto)
  glossary?: FsdGlossaryInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FsdRevisionInputDto)
  revisions?: FsdRevisionInputDto[];

  @IsOptional()
  @IsObject()
  editValues?: Record<string, string>;

  @IsOptional()
  @IsObject()
  richEditValues?: Record<string, string>;

  @IsOptional()
  @IsObject()
  sectionBackgroundValues?: Record<string, string>;

  @IsOptional()
  @IsObject()
  pageStyle?: {
    backgroundColor?: string;
  };

  @IsOptional()
  @IsIn(['en', 'fr'])
  language?: 'en' | 'fr';

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsIn(['Brouillon', 'En cours', 'Complete'])
  status?: 'Brouillon' | 'En cours' | 'Complete';

  @IsOptional()
  @IsString()
  sourceVersionId?: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsString()
  createdByName?: string;
}
