import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CnaeSearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
