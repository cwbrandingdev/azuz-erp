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
import { CLIENT_DIRECTORY_ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateClientGroupDto,
  UpdateClientGroupDto,
} from './dto/client-group.dto';
import { BulkImportClientGroupsDto } from './dto/bulk-import.dto';
import { ClientGroupsService } from './client-groups.service';

@Controller('client-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CLIENT_DIRECTORY_ROLES)
export class ClientGroupsController {
  constructor(private readonly clientGroupsService: ClientGroupsService) {}

  @Get()
  findAll() {
    return this.clientGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientGroupsService.findOne(id);
  }

  @Post('bulk')
  bulkImport(@Body() dto: BulkImportClientGroupsDto) {
    return this.clientGroupsService.bulkImport(dto);
  }

  @Post()
  create(@Body() dto: CreateClientGroupDto) {
    return this.clientGroupsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientGroupDto) {
    return this.clientGroupsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientGroupsService.remove(id);
  }
}
