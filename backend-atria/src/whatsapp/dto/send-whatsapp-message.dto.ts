import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsEntityId } from '../../common/validation/entity-id';

export class SendWhatsappMessageDto {
  @IsEntityId({ optional: true })
  leadId?: string;

  @IsEntityId({ optional: true })
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  templateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  templateLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(1024, { each: true })
  templateParameters?: string[];
}
