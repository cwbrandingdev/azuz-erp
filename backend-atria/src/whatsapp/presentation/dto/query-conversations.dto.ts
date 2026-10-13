import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { WhatsAppInboxStatus } from '../../domain/whatsapp-message';
import { WhatsAppInboxTab } from '../../domain/whatsapp-routing';

export class QueryConversationsDto {
  @IsOptional()
  @IsEnum(WhatsAppInboxTab)
  tab?: WhatsAppInboxTab;

  @IsOptional()
  @IsEnum(WhatsAppInboxStatus)
  status?: WhatsAppInboxStatus;

  @IsOptional()
  @IsIn(['mine', 'unassigned', 'all'])
  assignee?: 'mine' | 'unassigned' | 'all';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  leadStatus?: string;
}
