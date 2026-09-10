import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryInstagramPeriodDto {
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
