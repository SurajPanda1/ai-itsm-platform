import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateIncidentDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200)
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  impact?: string;

  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  urgency?: string;

  @IsOptional() @IsString() @MaxLength(100)
  affectedService?: string;

  @IsOptional() @IsUUID()
  configurationItemId?: string;
}
