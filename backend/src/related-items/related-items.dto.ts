import { IsIn, IsString } from 'class-validator';
export class AddRelatedItemDto {
  @IsString() relatedTicketNumber!: string;
  @IsIn(['CHILD_INCIDENT', 'RELATED_CHANGE', 'RELATED_PROBLEM']) relationshipType!: string;
}
