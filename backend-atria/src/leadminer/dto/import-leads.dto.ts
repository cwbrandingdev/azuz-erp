import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { IsEntityId } from '../../common/validation/entity-id';

export class LeadMinerLeadDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  instagram?: string;

  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsNumber()
  @IsOptional()
  reviews?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;
}

export class ImportLeadMinerLeadsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  category: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadMinerLeadDto)
  leads: LeadMinerLeadDto[];

  @IsOptional()
  @IsBoolean()
  addToKanban?: boolean;

  @IsEntityId({ optional: true })
  organizationId?: string;
}
