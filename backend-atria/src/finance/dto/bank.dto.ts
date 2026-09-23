import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  institution?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  initialBalance?: number;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  institution?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  initialBalance?: number;
}

export class ImportOfxDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class MatchStatementDto {
  @IsUUID()
  statementLineId: string;

  @IsUUID()
  transactionId: string;
}

export class IgnoreStatementLinesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
