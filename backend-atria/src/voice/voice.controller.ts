import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { CreateLeadCallDto } from './dto/create-lead-call.dto';
import { ListLeadCallsQueryDto } from './dto/list-lead-calls.query';
import { UpdateLeadCallDto } from './dto/update-lead-call.dto';
import { VoiceService } from './voice.service';

@Controller('voice')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get('config')
  getConfig() {
    return this.voiceService.getPublicConfig();
  }

  @Post('token')
  createToken(@CurrentUser() user: AuthenticatedUser) {
    return this.voiceService.createAccessToken(user);
  }

  @Get('calls')
  listCalls(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeadCallsQueryDto,
  ) {
    return this.voiceService.listCalls(user, query.leadId);
  }

  @Post('calls')
  startCall(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeadCallDto,
  ) {
    return this.voiceService.startCall(user, dto.leadId, dto.notes);
  }

  @Patch('calls/:id')
  updateCall(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadCallDto,
  ) {
    return this.voiceService.updateCall(user, id, dto);
  }
}
