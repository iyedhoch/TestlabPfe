import { IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateEnvItemDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}
export class UpdateEnvItemDto extends PartialType(CreateEnvItemDto) {}
