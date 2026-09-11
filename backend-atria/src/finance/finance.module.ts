import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { FinancesApiController } from './finances-api.controller';

@Module({
  controllers: [FinanceController, FinancesApiController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
