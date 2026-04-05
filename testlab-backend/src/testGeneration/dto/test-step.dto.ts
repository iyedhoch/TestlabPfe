import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

export class CreateTestStepDto {
  @IsString()
  testCaseId: string;

  @IsString()
  action: string;

  @IsString()
  expectedResult: string;

  @IsOptional()
  @IsInt()
  insertAfterOrder?: number | null;
}

export class UpdateTestStepDto {
  @IsString()
  action: string;

  @IsString()
  expectedResult: string;
}

export class ReorderTestStepsDto {
  @IsArray()
  steps: { id: string; order: number }[];
}

export class UpdatePreconditionDto {
  @IsString()
  content: string;
}
