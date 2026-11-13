import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class QueryJhonatanCalendarDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class CreateJhonatanCalendarDto {
  @IsDateString()
  startAt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  briefing?: string;
}
