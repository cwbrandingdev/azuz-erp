import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  CLIENT_DIRECTORY_ROLES,
  CLIENT_LOOKUP_ROLES,
  CLIENT_VIEW_AND_CREATE_ROLES,
} from '../auth/constants/roles';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientRequestsService } from '../client-requests/client-requests.service';
import { QueryClientRequestsDto } from '../client-requests/dto/client-request.dto';
import { Client360Service } from './client-360.service';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { BulkImportClientsDto } from './dto/bulk-import.dto';
import { Client360Section, QueryClient360Dto } from './dto/client-360.dto';
import { UsersService } from '../users/users.service';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CLIENT_DIRECTORY_ROLES)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly client360Service: Client360Service,
    private readonly clientRequestsService: ClientRequestsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Roles(...CLIENT_LOOKUP_ROLES)
  findAll(
    @Query('clientGroupId') clientGroupId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.clientsService.findAll(
      clientGroupId,
      activeOnly === 'true',
    );
  }

  @Get(':id/requests')
  @Roles(...CLIENT_VIEW_AND_CREATE_ROLES)
  getClientRequests(
    @Param('id') id: string,
    @Query() query: QueryClientRequestsDto,
  ) {
    return this.clientRequestsService.findAll({ ...query, clientId: id });
  }

  @Get(':id/360')
  @Roles(...CLIENT_VIEW_AND_CREATE_ROLES)
  getClient360(@Param('id') id: string, @Query() query: QueryClient360Dto) {
    return this.client360Service.getSection(
      id,
      query.section ?? Client360Section.SUMMARY,
    );
  }

  @Get(':id/access')
  @Roles(...CLIENT_VIEW_AND_CREATE_ROLES)
  getClientAccess(@Param('id') id: string) {
    return this.usersService.getClientAccessBundle(id);
  }

  @Get(':id')
  @Roles(...CLIENT_VIEW_AND_CREATE_ROLES)
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post('bulk')
  bulkImport(@Body() dto: BulkImportClientsDto) {
    return this.clientsService.bulkImport(dto);
  }

  @Post()
  @Roles(...CLIENT_VIEW_AND_CREATE_ROLES)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(dto, user);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.clientsService.deactivate(id);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  activate(@Param('id') id: string) {
    return this.clientsService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
