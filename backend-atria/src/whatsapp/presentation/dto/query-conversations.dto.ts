import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { WhatsAppInboxStatus } from '../../domain/whatsapp-message';

export class QueryConversationsDto {
  @IsOptional()
  @IsEnum(WhatsAppInboxStatus)
  status?: WhatsAppInboxStatus;

  @IsOptional()
  @IsIn(['mine', 'unassigned', 'all'])
  assignee?: 'mine' | 'unassigned' | 'all';

  @IsOptional()
  @IsString()
  q?: string;
}
