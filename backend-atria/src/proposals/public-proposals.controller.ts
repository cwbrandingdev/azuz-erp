import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PUBLIC_THROTTLE } from '../auth/constants/throttle';
import { Public } from '../auth/decorators/public.decorator';
import { ProposalsService } from './proposals.service';

@Public()
@Throttle(PUBLIC_THROTTLE)
@Controller('public/proposals')
export class PublicProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get(':id')
  findPublic(@Param('id') id: string) {
    return this.proposalsService.findPublic(id);
  }
}
