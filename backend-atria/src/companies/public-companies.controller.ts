import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CompaniesService } from './companies.service';

@Public()
@Controller('public/company')
export class PublicCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findPrimary() {
    return this.companiesService.findPrimary();
  }
}
