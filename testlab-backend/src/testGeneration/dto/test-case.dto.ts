import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PreconditionDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class TestStepDto {
  @IsString()
  action: string;

  @IsString()
  expectedResult: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateTestCaseDto {
  @IsString()
  name: string;

  @IsUUID()
  testSuiteId: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreconditionDto)
  preconditions?: PreconditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestStepDto)
  testSteps?: TestStepDto[];
}

export class UpdateTestCaseDto {
  @IsString()
  name: string;

  @IsString()
  summary: string;
}

export class MoveTestCaseDto {
  @IsUUID()
  testCaseId: string;

  @IsUUID()
  destinationSuiteId: string;
}
