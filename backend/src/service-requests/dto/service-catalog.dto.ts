import { IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateServiceCatalogItemDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  defaultAssignmentGroupId?: string;

  @IsOptional()
  @IsArray()
  formSchema?: unknown[];
}

export class UpdateServiceCatalogItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  defaultAssignmentGroupId?: string;

  @IsOptional()
  @IsArray()
  formSchema?: unknown[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateServiceRequestDto {
  @IsUUID()
  catalogItemId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  requestDetails?: Record<string, unknown>;
}
