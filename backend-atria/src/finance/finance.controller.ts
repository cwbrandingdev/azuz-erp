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
  CreateTransactionDto,
  QueryTransactionsDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { BulkImportTransactionsDto } from './dto/import-transactions.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { QueryFinanceCalendarDto } from './dto/query-finance-calendar.dto';
import { FinanceService } from './finance.service';

@Controller(['finance', 'financial'])
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleName.MASTER, RoleName.ADMIN)
@Permissions(Permission.FINANCE_ACCESS)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

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
