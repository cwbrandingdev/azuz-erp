import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredCrmPermissions } from '../auth/utils/rbac';
import { ImportLeadMinerLeadsDto } from './dto/import-leads.dto';
import { SearchLeadsDto } from './dto/search-leads.dto';
import { LeadminerService } from './leadminer.service';

@Controller('leadminer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class LeadMinerController {
  constructor(private readonly leadMinerService: LeadminerService) {}

  @Post('search')
  async searchLeads(@Body() dto: SearchLeadsDto) {
    return await this.leadMinerService.SearchLeads(dto);
  }

  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return await this.leadMinerService.getJobStatus(jobId);
  }

  @Post('import')
  async importLeads(@Body() dto: ImportLeadMinerLeadsDto) {
    return await this.leadMinerService.importLeads(dto);
  }
}
