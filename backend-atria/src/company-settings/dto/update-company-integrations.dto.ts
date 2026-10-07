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

  @IsString()
  @IsOptional()
  @MaxLength(64)
  whatsappPhoneNumberId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  whatsappBusinessAccountId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  whatsappVerifyToken?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  whatsappEmbeddedSignupConfigId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  whatsappAppId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  whatsappAppSecret?: string | null;
}
