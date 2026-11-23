import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MAX_GUEST_EMAILS } from './create-lead-meeting.dto';

export class UpdateLeadMeetingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  guestName?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GUEST_EMAILS)
  @IsEmail({}, { each: true })
  @MaxLength(255, { each: true })
  guestEmails?: string[];
}
