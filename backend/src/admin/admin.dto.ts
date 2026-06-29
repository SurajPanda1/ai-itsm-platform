import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsBoolean() managerRequiredExempt?: boolean;
  @IsString() @MinLength(8) temporaryPassword!: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsBoolean() managerRequiredExempt?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateGroupDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsIn(['FULFILLMENT', 'APPROVAL', 'BOTH']) groupType!: string;
  @IsUUID() managerId!: string;
}

export class UpdateGroupDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsIn(['FULFILLMENT', 'APPROVAL', 'BOTH']) groupType?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class GroupMemberDto { @IsUUID() userId!: string; }
export class GroupRoleDto { @IsUUID() roleId!: string; }

export class CreateDepartmentDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateSlaDefinitionDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsUUID() ticketTypeId?: string;
  @IsOptional() @IsUUID() priorityId?: string;
  @IsUUID() calendarId!: string;
  @IsInt() @Min(1) responseTargetMinutes!: number;
  @IsInt() @Min(1) resolutionTargetMinutes!: number;
  @IsOptional() @IsArray() @IsString({ each: true }) pauseStatuses?: string[];
}

export class CreateBusinessCalendarDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() timezone!: string;
  @IsIn(['TWENTY_FOUR_SEVEN', 'BUSINESS_HOURS']) calendarType!: string;
  @IsOptional() @IsObject() weeklySchedule?: Record<string, { start: string; end: string }[]>;
  @IsOptional() @IsArray() @IsString({ each: true }) holidays?: string[];
}

export class UpdateOrganizationSettingsDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) organizationName?: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) faviconUrl?: string;
  @IsOptional() @IsString() @MaxLength(20) primaryColor?: string;
  @IsOptional() @IsString() @MaxLength(20) accentColor?: string;
  @IsOptional() @IsString() @MaxLength(100) portalTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) welcomeMessage?: string;
  @IsOptional() @IsEmail() supportEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) supportPhone?: string;
  @IsOptional() @IsString() @MaxLength(100) timezone?: string;
  @IsOptional() @IsBoolean() showPoweredBy?: boolean;
  @IsOptional() @IsIn(['DARK', 'LIGHT', 'SYSTEM']) themeMode?: string;
  @IsOptional() @IsBoolean() attachmentsEnabled?: boolean;
  @IsOptional() @IsIn(['NONE', 'S3', 'AZURE_BLOB', 'GCS', 'MINIO', 'LOCAL']) storageProvider?: string;
  @IsOptional() @IsString() @MaxLength(200) storageBucket?: string;
  @IsOptional() @IsString() @MaxLength(100) storageRegion?: string;
  @IsOptional() @IsString() @MaxLength(500) storageEndpoint?: string;
  @IsOptional() @IsInt() @Min(1) maxFileSizeMb?: number;
}

export class TestStorageConnectionDto {
  @IsIn(['S3', 'AZURE_BLOB', 'GCS', 'MINIO', 'LOCAL']) provider!: string;
  @IsString() @MinLength(1) bucket!: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() endpoint?: string;
}

export class CreateChangeApprovalRuleDto {
  @IsInt() @Min(1) sequence!: number;
  @IsIn(['MANAGER', 'GROUP', 'SPECIFIC_USER', 'CAB', 'SECURITY', 'ITAM']) approvalType!: string;
  @IsOptional() @IsUUID() approvalGroupId?: string;
  @IsOptional() @IsUUID() specificApproverId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateChangeApprovalRuleDto {
  @IsOptional() @IsInt() @Min(1) sequence?: number;
  @IsOptional() @IsIn(['MANAGER', 'GROUP', 'SPECIFIC_USER', 'CAB', 'SECURITY', 'ITAM']) approvalType?: string;
  @IsOptional() @IsUUID() approvalGroupId?: string;
  @IsOptional() @IsUUID() specificApproverId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateCiCategoryDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCiCategoryDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateCiTypeDto {
  @IsUUID() categoryId!: string;
  @IsString() @MinLength(2) @MaxLength(50) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCiTypeDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(50) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateCiRelationshipTypeDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCiRelationshipTypeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
