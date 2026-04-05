import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class EnvItemDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}

export class CreateEnvironmentDto {
  @IsString()
  name: string;

  @IsUrl()
  url: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvItemDto)
  envItems?: EnvItemDto[];
}
export class UpdateEnvironmentDto extends PartialType(CreateEnvironmentDto) {}
