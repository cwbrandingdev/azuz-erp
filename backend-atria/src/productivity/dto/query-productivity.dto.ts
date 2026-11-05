import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryProductivityDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
