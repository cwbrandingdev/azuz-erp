import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '../auth/constants/permissions';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredCrmPermissions } from '../auth/utils/rbac';
import { CompleteEmbeddedSignupDto } from './dto/complete-embedded-signup.dto';
import { ListWhatsappConversationsQueryDto } from './dto/list-whatsapp.query';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions(), Permission.SETTINGS_MANAGE)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('config')
  getConfig() {
    return this.whatsappService.getPublicConfig();
  }

  @Post('embedded-signup')
  completeEmbeddedSignup(@Body() dto: CompleteEmbeddedSignupDto) {
    return this.whatsappService.completeEmbeddedSignup(dto);
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
