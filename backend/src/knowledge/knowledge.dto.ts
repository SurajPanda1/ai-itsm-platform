import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateKnowledgeArticleDto {
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: string;
  @IsOptional() @IsIn(['EMPLOYEES', 'IT_AGENTS', 'IT_MANAGERS', 'ADMINS']) visibility?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() keywords?: string;
}

export class UpdateKnowledgeArticleDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) category?: string;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: string;
  @IsOptional() @IsIn(['EMPLOYEES', 'IT_AGENTS', 'IT_MANAGERS', 'ADMINS']) visibility?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() keywords?: string;
}
