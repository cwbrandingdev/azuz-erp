import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { KanbanTaskContentType } from '@prisma/client';

export class QueryInstagramInsightsDto {
  @IsOptional()
  @IsEnum(KanbanTaskContentType)
  contentType?: KanbanTaskContentType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}
