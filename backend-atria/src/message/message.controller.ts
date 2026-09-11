import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Message } from '@prisma/client';
import { INTERNAL_STAFF_ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageService } from './message.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...INTERNAL_STAFF_ROLES)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto): Promise<Message> {
    return this.messageService.create(createMessageDto);
  }

  @Get()
  findAll() {
    return "Está funfando";
  }
}
