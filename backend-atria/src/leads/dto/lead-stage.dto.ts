import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { IsEntityId } from '../../common/validation/entity-id';

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export class LeadStagesQueryDto {
  @IsEntityId({ optional: true })
  organizationId?: string;
}

export class CreateLeadStageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR)
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsEntityId({ optional: true })
  organizationId?: string;
}

export class UpdateLeadStageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR)
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReorderLeadStagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEntityId({ each: true })
  ids: string[];

  @IsEntityId({ optional: true })
  organizationId?: string;
}
