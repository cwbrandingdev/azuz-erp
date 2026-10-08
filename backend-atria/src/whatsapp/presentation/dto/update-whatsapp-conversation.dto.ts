import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  WhatsAppInboxPriority,
  WhatsAppInboxStatus,
} from '../../domain/whatsapp-message';

export class UpdateWhatsAppConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(WhatsAppInboxStatus)
  status?: WhatsAppInboxStatus;

  @IsOptional()
  @IsEnum(WhatsAppInboxPriority)
  priority?: WhatsAppInboxPriority;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  assignedUserId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];
}
