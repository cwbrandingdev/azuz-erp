import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyIntegrationsDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  metaAdAccountId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaPageAccessToken?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  metaPageId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  metaAppId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaAppSecret?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  apifyApiToken?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  whatsappApiToken?: string | null;
}
