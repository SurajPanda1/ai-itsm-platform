import { IsIn, IsString, IsUUID, MinLength } from 'class-validator';

export class AssignIncidentDto {
  @IsUUID()
  assignmentGroupId!: string;

  @IsUUID()
  assignedToId!: string;
}

export class ChangeStatusDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status!: string;
}

export class AddCommentDto {
  @IsString()
  @MinLength(1)
  comment!: string;

  @IsIn(['COMMENT', 'WORK_NOTE'])
  type: 'COMMENT' | 'WORK_NOTE' = 'COMMENT';
}

export class ResolveIncidentDto {
  @IsString()
  @MinLength(3)
  resolutionNotes!: string;
}
