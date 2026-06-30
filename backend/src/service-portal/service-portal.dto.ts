import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateServicePortalSettingsDto {
  @IsOptional() @IsBoolean() portalEnabled?: boolean;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) portalName?: string;
  @IsOptional() @IsString() welcomeMessage?: string;
  @IsOptional() @IsIn(['HOME', 'MY_INCIDENTS', 'MY_REQUESTS', 'KNOWLEDGE']) defaultLandingPage?: string;

  @IsOptional() @IsBoolean() knowledgeEnabled?: boolean;
  @IsOptional() @IsBoolean() allowKbSearch?: boolean;
  @IsOptional() @IsBoolean() allowKbRatings?: boolean;

  @IsOptional() @IsBoolean() bannerEnabled?: boolean;
  @IsOptional() @IsString() bannerMessage?: string;
  @IsOptional() @IsString() @MaxLength(20) bannerBackgroundColor?: string;
  @IsOptional() @IsString() @MaxLength(20) bannerTextColor?: string;
  @IsOptional() @IsIn(['INFORMATION', 'WARNING', 'CRITICAL']) bannerPriority?: string;

  @IsOptional() @IsBoolean() allowIncidentCreation?: boolean;
  @IsOptional() @IsBoolean() allowServiceRequests?: boolean;
  @IsOptional() @IsBoolean() allowEmployeeCloseTicket?: boolean;
  @IsOptional() @IsBoolean() showRecentTickets?: boolean;
  @IsOptional() @IsBoolean() showMyRequests?: boolean;
}
