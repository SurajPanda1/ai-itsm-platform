import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const taskStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const problemStatuses = ['OPEN', 'ASSESS', 'ROOT_CAUSE_ANALYSIS', 'FIX', 'RESOLVED', 'CLOSED'] as const;

export class CreateProblemDto {
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(priorities) priority: (typeof priorities)[number] = 'MEDIUM';
  @IsOptional() @IsIn(riskLevels) impact: (typeof riskLevels)[number] = 'MEDIUM';
  @IsOptional() @IsIn(riskLevels) risk: (typeof riskLevels)[number] = 'MEDIUM';
  @IsOptional() @IsString() rootCause?: string;
  @IsOptional() @IsString() workaround?: string;
  @IsOptional() @IsString() permanentFix?: string;
  @IsOptional() @IsBoolean() knownError?: boolean;
  @IsOptional() @IsUUID() configurationItemId?: string;
}

export class UpdateProblemDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(priorities) priority?: (typeof priorities)[number];
  @IsOptional() @IsIn(riskLevels) impact?: (typeof riskLevels)[number];
  @IsOptional() @IsIn(riskLevels) risk?: (typeof riskLevels)[number];
  @IsOptional() @IsString() rootCause?: string;
  @IsOptional() @IsString() workaround?: string;
  @IsOptional() @IsString() permanentFix?: string;
  @IsOptional() @IsBoolean() knownError?: boolean;
  @IsOptional() @IsUUID() configurationItemId?: string;
}

export class ChangeProblemStatusDto {
  @IsIn(problemStatuses)
  status!: (typeof problemStatuses)[number];
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
  @IsOptional() @IsString() workNote?: string;
}
