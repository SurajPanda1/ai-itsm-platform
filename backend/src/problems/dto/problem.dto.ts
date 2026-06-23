import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const taskStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export class CreateProblemDto {
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(priorities) priority: (typeof priorities)[number] = 'MEDIUM';
  @IsOptional() @IsString() rootCause?: string;
  @IsOptional() @IsString() workaround?: string;
  @IsOptional() @IsString() permanentFix?: string;
  @IsOptional() @IsBoolean() knownError?: boolean;
}

export class UpdateProblemDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(priorities) priority?: (typeof priorities)[number];
  @IsOptional() @IsString() rootCause?: string;
  @IsOptional() @IsString() workaround?: string;
  @IsOptional() @IsString() permanentFix?: string;
  @IsOptional() @IsBoolean() knownError?: boolean;
}

export class CreateProblemTaskDto {
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() assignmentGroupId?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
}

export class UpdateProblemTaskDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() assignmentGroupId?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsIn(taskStatuses) status?: string;
}
