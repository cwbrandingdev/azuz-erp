import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredCrmPermissions } from '../auth/utils/rbac';
import { ListWhatsappConversationsQueryDto } from './dto/list-whatsapp.query';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('config')
  getConfig() {
    return this.whatsappService.getPublicConfig();
  }

  @Get('conversations')
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWhatsappConversationsQueryDto,
  ) {
    return this.whatsappService.listConversations(user, query);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.whatsappService.listMessages(user, id);
  }

  @Post('messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendWhatsappMessageDto,
  ) {
    return this.whatsappService.sendMessage(user, dto);
  }
}
