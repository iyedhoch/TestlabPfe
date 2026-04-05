import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateTestSuiteDto {
  @IsString()
  name: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class UpdateTestSuiteDto {
  @IsString()
  name: string;
}

export class MoveTestSuiteDto {
  @IsUUID()
  suiteId: string;

  // null = move to root level
  @IsOptional()
  @IsUUID()
  destinationSuiteId: string | null;
}

export class ReorderTestSuitesDto {
  suites: { id: string; order: number }[];
}
