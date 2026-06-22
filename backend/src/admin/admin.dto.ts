import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsString() @MinLength(8) temporaryPassword!: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateGroupDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() managerId?: string;
}

export class UpdateGroupDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class GroupMemberDto { @IsUUID() userId!: string; }
export class GroupRoleDto { @IsUUID() roleId!: string; }

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
