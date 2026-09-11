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
import { INTERNAL_STAFF_ROLES, USER_MANAGEMENT_ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateUserGroupDto,
  UpdateUserGroupDto,
  AddUserGroupMembersDto,
} from '../users/dto/user.dto';
import { UserGroupsService } from './user-groups.service';

const MEMBER_ROLES = [...INTERNAL_STAFF_ROLES] as const;

@Controller('user-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...MEMBER_ROLES)
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Get()
  findAll() {
    return this.userGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userGroupsService.findOne(id);
  }

  @Post()
  @Roles(...USER_MANAGEMENT_ROLES)
  create(@Body() dto: CreateUserGroupDto) {
    return this.userGroupsService.create(dto);
  }

  @Patch(':id')
  @Roles(...USER_MANAGEMENT_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateUserGroupDto) {
    return this.userGroupsService.update(id, dto);
  }

  @Patch(':id/members')
  @Roles(...USER_MANAGEMENT_ROLES)
  addMembers(@Param('id') id: string, @Body() dto: AddUserGroupMembersDto) {
    return this.userGroupsService.addMembers(id, dto.memberIds);
  }

  @Delete(':id')
  @Roles(...USER_MANAGEMENT_ROLES)
  remove(@Param('id') id: string) {
    return this.userGroupsService.remove(id);
  }
}
