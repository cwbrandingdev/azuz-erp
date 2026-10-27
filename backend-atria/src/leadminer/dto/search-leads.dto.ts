import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SearchLeadsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  neighborhood?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  max_results: number;
}
