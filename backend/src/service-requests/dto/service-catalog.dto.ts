import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateServiceCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

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

  @IsOptional()
  @IsArray()
  taskTemplates?: unknown[];
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
  @IsArray()
  taskTemplates?: unknown[];

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

export class CreateApprovalRuleDto {
  @IsUUID()
  catalogItemId!: string;

  @IsInt()
  @Min(1)
  sequence!: number;

  @IsIn(['MANAGER', 'GROUP', 'SPECIFIC_USER'])
  approvalType!: string;

  @IsOptional()
  @IsUUID()
  approvalGroupId?: string;

  @IsOptional()
  @IsUUID()
  specificApproverId?: string;
}

export class DecideApprovalDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: string;

  @IsOptional()
  @IsString()
  decisionComment?: string;
}

export class UpdateRequestTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assignmentGroupId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: string;
}
