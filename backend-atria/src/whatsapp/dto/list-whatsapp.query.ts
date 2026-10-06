import { IsOptional, IsString } from 'class-validator';
import { IsEntityId } from '../../common/validation/entity-id';

export class ListWhatsappConversationsQueryDto {
  @IsEntityId({ optional: true })
  leadId?: string;

  @IsEntityId({ optional: true })
  clientId?: string;
}

export class ListWhatsappMessagesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}
