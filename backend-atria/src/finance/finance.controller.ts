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
import { RoleName, TransactionType } from '@prisma/client';
import { Permission } from '../auth/constants/permissions';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  CreateBankAccountDto,
  IgnoreStatementLinesDto,
  ImportOfxDto,
  MatchStatementDto,
  UpdateBankAccountDto,
} from './dto/bank.dto';
import {
  QueryAnnualDreDto,
  QueryCashFlowStatementDto,
  QueryDateRangeDto,
  QueryProjectedCashFlowDto,
} from './dto/finance-reports.dto';
import {
  CreateTransactionDto,
  QueryTransactionsDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { BulkImportTransactionsDto } from './dto/import-transactions.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { QueryFinanceCalendarDto } from './dto/query-finance-calendar.dto';
import { FinanceBanksService } from './finance-banks.service';
import { FinanceLegacyService } from './finance-legacy.service';
import { FinanceReportsService } from './finance-reports.service';
import { FinanceService } from './finance.service';

@Controller(['finance', 'financial'])
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleName.MASTER, RoleName.ADMIN)
@Permissions(Permission.FINANCE_ACCESS)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly financeReportsService: FinanceReportsService,
    private readonly financeBanksService: FinanceBanksService,
    private readonly financeLegacyService: FinanceLegacyService,
  ) {}

  @Get('chart-of-accounts')
  getChartOfAccounts() {
    return this.financeService.getCategories();
  }

  @Get('management-dashboard')
  getManagementDashboard(@Query() query: QueryDateRangeDto) {
    return this.financeReportsService.getManagementDashboard(query);
  }

  @Get('cash-flow-statement')
  getCashFlowStatement(@Query() query: QueryCashFlowStatementDto) {
    return this.financeReportsService.getCashFlowStatement(query);
  }

  @Get('projected-cash-flow')
  getProjectedCashFlow(@Query() query: QueryProjectedCashFlowDto) {
    return this.financeReportsService.getProjectedCashFlow(query);
  }

  @Get('dre')
  getAnnualDre(@Query() query: QueryAnnualDreDto) {
    return this.financeReportsService.getAnnualDre(query);
  }

  @Get('banks')
  listBanks() {
    return this.financeBanksService.listAccounts();
  }

  @Post('banks')
  createBank(@Body() dto: CreateBankAccountDto) {
    return this.financeBanksService.createAccount(dto);
  }

  @Patch('banks/:id')
  updateBank(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.financeBanksService.updateAccount(id, dto);
  }

  @Delete('banks/:id')
  deleteBank(@Param('id') id: string) {
    return this.financeBanksService.deleteAccount(id);
  }

  @Post('banks/:id/ofx')
  importOfx(@Param('id') id: string, @Body() dto: ImportOfxDto) {
    return this.financeBanksService.importOfx(id, dto);
  }

  @Get('reconciliation')
  getReconciliation(@Query('bankAccountId') bankAccountId?: string) {
    return this.financeBanksService.getReconciliation(bankAccountId);
  }

  @Post('reconciliation/match')
  matchStatement(@Body() dto: MatchStatementDto) {
    return this.financeBanksService.match(dto);
  }

  @Post('reconciliation/ignore')
  ignoreStatement(@Body() dto: IgnoreStatementLinesDto) {
    return this.financeBanksService.ignore(dto);
  }

  @Get('legacy/categories')
  getLegacyCategories(@Query('type') type?: TransactionType) {
    return this.financeLegacyService.getCategories(type);
  }

  @Get('legacy/overview')
  getLegacyOverview(@Query() query: QueryFinanceDto) {
    return this.financeLegacyService.getOverview(query);
  }

  @Get('legacy/transactions')
  getLegacyTransactions(@Query() query: QueryTransactionsDto) {
    return this.financeLegacyService.getTransactions(query);
  }

  @Get('overview')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryFinanceDto,
  ) {
    return this.financeService.getOverview(user.userId, query);
  }

  @Get('cash-flow')
  getCashFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryFinanceDto,
  ) {
    return this.financeService.getCashFlow(user.userId, query);
  }

  @Get('calendar')
  getCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryFinanceCalendarDto,
  ) {
    return this.financeService.getFinancialCalendar(user.userId, query);
  }

  @Get('categories')
  getCategories(@Query('type') type?: TransactionType) {
    return this.financeService.getCategories(type);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.financeService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.financeService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.financeService.deleteCategory(id);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTransactionsDto,
  ) {
    return this.financeService.getTransactions(user.userId, query);
  }

  @Post('transactions/import')
  importTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkImportTransactionsDto,
  ) {
    return this.financeService.bulkImportTransactions(user.userId, dto);
  }

  @Post('transactions')
  createTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.financeService.createTransaction(user.userId, dto);
  }

  @Patch('transactions/:id')
  updateTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.financeService.updateTransaction(user.userId, id, dto);
  }

  @Delete('transactions/:id')
  deleteTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.financeService.deleteTransaction(user.userId, id);
  }
}
