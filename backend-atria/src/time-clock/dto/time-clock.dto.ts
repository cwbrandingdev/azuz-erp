import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TimeClockEntryType } from '@prisma/client';
import { IsEntityId, ToUpperEnum } from '../../common/validation/entity-id';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class PunchTimeClockDto {
  @ToUpperEnum()
  @IsEnum(TimeClockEntryType)
  type: TimeClockEntryType;
}

export class TimeClockRangeQueryDto {
  @IsOptional()
  @Matches(DAY_KEY_PATTERN, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DAY_KEY_PATTERN, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}

export class TimeClockListQueryDto extends TimeClockRangeQueryDto {
  @IsEntityId({ optional: true })
  userId?: string;
}

export class CreateManualTimeClockEntryDto {
  @IsEntityId()
  userId: string;

  @ToUpperEnum()
  @IsEnum(TimeClockEntryType)
  type: TimeClockEntryType;

  @IsDateString()
  punchedAt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

export class UpdateTimeClockEntryDto {
  @IsOptional()
  @ToUpperEnum()
  @IsEnum(TimeClockEntryType)
  type?: TimeClockEntryType;

  @IsOptional()
  @IsDateString()
  punchedAt?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}
