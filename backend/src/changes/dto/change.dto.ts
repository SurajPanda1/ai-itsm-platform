import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const changeTypes = ['STANDARD', 'NORMAL', 'EMERGENCY'] as const;
const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const changeStatuses = ['NEW', 'PLAN', 'APPROVAL', 'CAB', 'SCHEDULED', 'IMPLEMENT', 'VALIDATE', 'CLOSED'] as const;

export class CreateChangeDto {
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(priorities) priority: (typeof priorities)[number] = 'MEDIUM';
  @IsOptional() @IsIn(changeTypes) changeType: (typeof changeTypes)[number] = 'NORMAL';
  @IsOptional() @IsIn(riskLevels) risk: (typeof riskLevels)[number] = 'MEDIUM';
  @IsOptional() @IsIn(riskLevels) impact: (typeof riskLevels)[number] = 'MEDIUM';
  @IsOptional() @IsDateString() plannedStart?: string;
  @IsOptional() @IsDateString() plannedEnd?: string;
  @IsOptional() @IsString() implementationPlan?: string;
  @IsOptional() @IsString() rollbackPlan?: string;
  @IsOptional() @IsString() testPlan?: string;
  @IsOptional() @IsUUID() configurationItemId?: string;
}

export class UpdateChangeDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(priorities) priority?: (typeof priorities)[number];
  @IsOptional() @IsIn(changeTypes) changeType?: (typeof changeTypes)[number];
  @IsOptional() @IsIn(riskLevels) risk?: (typeof riskLevels)[number];
  @IsOptional() @IsIn(riskLevels) impact?: (typeof riskLevels)[number];
  @IsOptional() @IsDateString() plannedStart?: string;
  @IsOptional() @IsDateString() plannedEnd?: string;
  @IsOptional() @IsString() implementationPlan?: string;
  @IsOptional() @IsString() rollbackPlan?: string;
  @IsOptional() @IsString() testPlan?: string;
  @IsOptional() @IsUUID() configurationItemId?: string;
}

export class ChangeChangeStatusDto {
  @IsIn(changeStatuses)
  status!: (typeof changeStatuses)[number];
}
