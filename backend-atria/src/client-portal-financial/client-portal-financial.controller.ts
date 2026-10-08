import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { memoryStorage } from 'multer';
import { UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES } from '../common/upload/upload-limits';
import { ValidateUploadFileSizePipe } from '../common/upload/validate-upload-file-size.pipe';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientPortalFinancialService } from './client-portal-financial.service';
import { CreateClientFinancialAttachmentDto } from './dto/create-client-financial-attachment.dto';

@Controller('client-portal/financial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.CLIENT)
export class ClientPortalFinancialController {
  constructor(
    private readonly financialService: ClientPortalFinancialService,
  ) {}

  @Get('attachments')
  listAttachments(@CurrentUser() user: AuthenticatedUser) {
    const clientId = this.requireClientId(user);
    return this.financialService.listForClient(clientId);
  }

  @Post('attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    }),
  )
  uploadAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(ValidateUploadFileSizePipe) file: Express.Multer.File,
    @Body() dto: CreateClientFinancialAttachmentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    const clientId = this.requireClientId(user);
    return this.financialService.uploadForClient(clientId, dto, file);
  }

  private requireClientId(user: AuthenticatedUser): string {
    if (!user.clientId) {
      throw new BadRequestException(
        'Usuário CLIENT sem empresa vinculada. Contate o administrador.',
      );
    }
    return user.clientId;
  }
}
