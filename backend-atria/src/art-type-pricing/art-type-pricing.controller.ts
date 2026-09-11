import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Permission } from '../auth/constants/permissions';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ArtTypePricingService } from './art-type-pricing.service';
import {
  CreateArtTypePricingDto,
  UpdateArtTypePricingDto,
} from './dto/art-type-pricing.dto';

@Controller('art-type-pricing')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleName.MASTER, RoleName.ADMIN)
@Permissions(Permission.FINANCE_ACCESS)
export class ArtTypePricingController {
  constructor(private readonly artTypePricingService: ArtTypePricingService) {}

  @Get()
  findAll() {
    return this.artTypePricingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artTypePricingService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateArtTypePricingDto) {
    return this.artTypePricingService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArtTypePricingDto) {
    return this.artTypePricingService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.artTypePricingService.remove(id);
  }
}
