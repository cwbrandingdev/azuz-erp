import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertBroadcastDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  body?: string | null;

  @IsOptional()
  @IsString()
  templateName?: string | null;

  @IsOptional()
  @IsString()
  templateLanguage?: string | null;

  @IsOptional()
  @IsString()
  matchLabel?: string | null;

  @IsOptional()
  @IsString()
  matchStageId?: string | null;

  @IsOptional()
  @IsString()
  matchSource?: string | null;

  @IsOptional()
  @IsString()
  matchLeadStatus?: string | null;

  @IsOptional()
  @IsString()
  scheduledAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  ratePerMinute?: number;
}

export class PreviewBroadcastDto {
  @IsOptional()
  @IsString()
  matchLabel?: string | null;

  @IsOptional()
  @IsString()
  matchStageId?: string | null;

  @IsOptional()
  @IsString()
  matchSource?: string | null;

  @IsOptional()
  @IsString()
  matchLeadStatus?: string | null;
}
