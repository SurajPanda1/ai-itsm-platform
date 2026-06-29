import { IsIn, IsString } from 'class-validator';
export class AddRelatedItemDto {
  @IsString() relatedTicketNumber!: string;
  @IsIn(['CHILD_INCIDENT', 'RELATED_CHANGE', 'RELATED_PROBLEM', 'CAUSED_BY_CHANGE', 'CAUSED_INCIDENT', 'IMPLEMENTED_BY_CHANGE']) relationshipType!: string;
}
