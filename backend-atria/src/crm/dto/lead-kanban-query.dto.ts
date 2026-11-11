import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { firstQueryValue } from '../../common/validation/query-param';
import { ProspectingLeadsQueryDto } from './prospecting-leads-query.dto';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
export const KANBAN_SEARCH_MAX_LENGTH = 200;

export class LeadKanbanQueryDto extends ProspectingLeadsQueryDto {
  @Transform(({ value }) => firstQueryValue(value))
  @IsOptional()
  @IsString()
  @MaxLength(KANBAN_SEARCH_MAX_LENGTH)
  search?: string;

  @Transform(({ value }) => firstQueryValue(value))
  @IsOptional()
  @IsString()
  @MaxLength(KANBAN_SEARCH_MAX_LENGTH)
  category?: string;

  @Transform(({ value }) => firstQueryValue(value))
  @IsOptional()
  @Matches(DATE_KEY)
  startDate?: string;

  @Transform(({ value }) => firstQueryValue(value))
  @IsOptional()
  @Matches(DATE_KEY)
  endDate?: string;
}

export class LeadKanbanColumnQueryDto extends LeadKanbanQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
