import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum B2bLeadSearchQueryType {
  NICHO = 'NICHO',
  CNAE = 'CNAE',
}

export class B2bLeadSearchDto {
  @IsOptional()
  @IsEnum(B2bLeadSearchQueryType)
  queryType?: B2bLeadSearchQueryType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  queryValue: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  uf: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  /** @deprecated Prefer page/pageSize. Kept for callers that still send a hard cap. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500_000)
  maxResults?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  openedFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  openedTo?: string;
}
