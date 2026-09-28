import { IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ContentPlatform,
  ContentPostFormat,
  ContentPostStatus,
} from '@prisma/client';
import { IsEntityId, ToUpperEnum } from '../../common/validation/entity-id';

export class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  mimeType?: string;
}

export class CreateContentPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsEntityId()
  clientId: string;

  @ToUpperEnum()
  @IsEnum(ContentPlatform)
  platform: ContentPlatform;

  @ToUpperEnum()
  @IsEnum(ContentPostFormat)
  @IsOptional()
  format?: ContentPostFormat;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ToUpperEnum()
  @IsEnum(ContentPostStatus)
  @IsOptional()
  status?: ContentPostStatus;

  @IsString()
  @IsNotEmpty()
  copy: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  referenceUrl?: string;

  @IsEntityId({ optional: true })
  assigneeId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsBoolean()
  @IsOptional()
  publishToInstagram?: boolean;
}

export class UpdateContentPostDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsEntityId({ optional: true })
  clientId?: string;

  @ToUpperEnum()
  @IsEnum(ContentPlatform)
  @IsOptional()
  platform?: ContentPlatform;

  @ToUpperEnum()
  @IsEnum(ContentPostFormat)
  @IsOptional()
  format?: ContentPostFormat;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string | null;

  @ToUpperEnum()
  @IsEnum(ContentPostStatus)
  @IsOptional()
  status?: ContentPostStatus;

  @IsString()
  @IsOptional()
  copy?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  referenceUrl?: string | null;

  @IsEntityId({ optional: true })
  assigneeId?: string | null;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsBoolean()
  @IsOptional()
  publishToInstagram?: boolean;
}

export class QueryContentPostsDto {
  @IsEntityId({ optional: true })
  clientId?: string;

  @ToUpperEnum()
  @IsOptional()
  @IsEnum(ContentPlatform)
  platform?: ContentPlatform;

  @ToUpperEnum()
  @IsOptional()
  @IsEnum(ContentPostStatus)
  status?: ContentPostStatus;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
