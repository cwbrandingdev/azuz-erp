import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { FinanceBanksService } from './finance-banks.service';
import { FinanceDailyDigestService } from './finance-daily-digest.service';
import { FinanceLegacyService } from './finance-legacy.service';
import { FinanceController } from './finance.controller';
import { FinanceReportsService } from './finance-reports.service';
import { FinanceService } from './finance.service';
import { FinancesApiController } from './finances-api.controller';

@Module({
  imports: [MailModule],
  controllers: [FinanceController, FinancesApiController],
  providers: [
    FinanceService,
    FinanceReportsService,
    FinanceBanksService,
    FinanceDailyDigestService,
    FinanceLegacyService,
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
