import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ProspectingLeadsQueryDto } from './prospecting-leads-query.dto';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export class LeadKanbanQueryDto extends ProspectingLeadsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @Matches(DATE_KEY)
  startDate?: string;

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
