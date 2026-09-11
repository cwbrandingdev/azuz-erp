import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateSuggestionDto,
  UpdateSuggestionStatusDto,
} from './dto/suggestion.dto';
import { SuggestionsService } from './suggestions.service';

@Controller('suggestions')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSuggestionDto,
  ) {
    return this.suggestionsService.create(
      user.userId,
      user.companyId,
      dto,
    );
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.suggestionsService.findMine(user.userId, user.companyId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleName.MASTER)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.suggestionsService.findAll(user.companyId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(RoleName.MASTER)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSuggestionStatusDto,
  ) {
    return this.suggestionsService.updateStatus(
      id,
      user.role,
      user.companyId,
      dto,
    );
  }
}
