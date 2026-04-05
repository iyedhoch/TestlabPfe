import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Platform, ProjectStatus } from '_prisma/enums';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsNotEmpty()
  description: string;
  @IsString()
  @IsOptional()
  prefix: string;
  @IsArray()
  @IsOptional()
  platforms?: Platform[];

  @IsString()
  @IsOptional()
  figmaLink?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;
  @IsString()
  @IsOptional()
  clickupListId?: string;
}
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
