import { WhatsAppTriggerEvent } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertTriggerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(WhatsAppTriggerEvent)
  eventType?: WhatsAppTriggerEvent;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  delayMinutes?: number;

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
  matchStageId?: string | null;

  @IsOptional()
  @IsString()
  matchLabel?: string | null;
}

export class FireTriggerDto {
  @IsEnum(WhatsAppTriggerEvent)
  eventType: WhatsAppTriggerEvent;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  entityKey?: string;

  @IsOptional()
  @IsObject()
  vars?: Record<string, string>;
}
