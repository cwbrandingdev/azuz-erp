import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RoutingRuleItemDto {
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
  targetUserGroupId?: string | null;

  @IsOptional()
  @IsString()
  targetUserId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class UpsertRoutingRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutingRuleItemDto)
  rules: RoutingRuleItemDto[];
}
