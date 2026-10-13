import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StageMessageItemDto {
  @IsString()
  stageId: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  body?: string | null;

  @IsOptional()
  @IsString()
  templateName?: string | null;

  @IsOptional()
  @IsString()
  templateLanguage?: string | null;
}

export class UpsertStageMessagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageMessageItemDto)
  rules: StageMessageItemDto[];
}
