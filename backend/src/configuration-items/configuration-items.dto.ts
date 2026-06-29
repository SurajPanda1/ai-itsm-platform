import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateConfigurationItemDto {
  @IsOptional() @IsString() @MaxLength(30) ciNumber?: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsUUID() categoryId!: string;
  @IsUUID() typeId!: string;
  @IsUUID() statusId!: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsString() @MaxLength(30) environment?: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) criticality?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateConfigurationItemDto {
  @IsOptional() @IsString() @MaxLength(30) ciNumber?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() typeId?: string;
  @IsOptional() @IsUUID() statusId?: string;
  @IsOptional() @IsUUID() ownerId?: string;
  @IsOptional() @IsString() @MaxLength(30) environment?: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) criticality?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateCiRelationshipDto {
  @IsUUID() parentCiId!: string;
  @IsUUID() relationshipTypeId!: string;
  @IsUUID() childCiId!: string;
  @IsIn(['ACTIVE', 'INACTIVE']) status!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateCiRelationshipDto {
  @IsOptional() @IsUUID() parentCiId?: string;
  @IsOptional() @IsUUID() relationshipTypeId?: string;
  @IsOptional() @IsUUID() childCiId?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: string;
  @IsOptional() @IsString() description?: string;
}

export class PreviewCmdbImportDto {
  @IsArray() @IsObject({ each: true }) rows!: Record<string, string>[];
}

export class ConfirmCmdbImportDto extends PreviewCmdbImportDto {}
