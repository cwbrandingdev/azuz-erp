import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { WhatsAppRoutingMode } from '../../domain/whatsapp-routing';

export class UpdateInboxSettingsDto {
  @IsOptional()
  @IsEnum(WhatsAppRoutingMode)
  routingMode?: WhatsAppRoutingMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  slaFirstResponseMinutes?: number;

  @IsOptional()
  @IsBoolean()
  autoReassignEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  autoReassignMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  botEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  aiAutoReply?: boolean;
}
