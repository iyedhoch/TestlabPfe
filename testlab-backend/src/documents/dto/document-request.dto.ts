import { IsIn, IsOptional, IsString } from 'class-validator';

export class DocumentRequestDto {
  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pdf', 'word', 'excel'])
  format?: 'pdf' | 'word' | 'excel';

  @IsOptional()
  @IsString()
  @IsIn(['en', 'fr'])
  language?: 'en' | 'fr';
}
