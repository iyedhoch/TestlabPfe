import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CahierApprovalInputDto {
  @IsString()
  approverName: string;

  @IsString()
  approverRole: string;

  @IsString()
  approvalDate: string;
}

export class GenerateCahierDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSuiteIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedTestCaseIds?: string[];

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
  description?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  projectOwner?: string;

  @IsOptional()
  @IsInt()
  openDefects?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CahierApprovalInputDto)
  approvals?: CahierApprovalInputDto[];

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