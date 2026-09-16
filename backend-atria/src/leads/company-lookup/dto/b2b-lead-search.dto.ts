import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum B2bLeadSearchQueryType {
  NICHO = 'NICHO',
  CNAE = 'CNAE',
}

export class B2bLeadSearchDto {
  @IsEnum(B2bLeadSearchQueryType)
  queryType: B2bLeadSearchQueryType;

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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxResults?: number;
}
