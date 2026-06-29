import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class CreateIncidentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(levels)
  priority: (typeof levels)[number] = 'MEDIUM';

  @IsOptional()
  @IsIn(levels)
  impact: (typeof levels)[number] = 'LOW';

  @IsOptional()
  @IsIn(levels)
  urgency: (typeof levels)[number] = 'LOW';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  affectedService?: string;

  @IsOptional()
  @IsUUID()
  createdForId?: string;

  @IsOptional()
  @IsUUID()
  configurationItemId?: string;
}
