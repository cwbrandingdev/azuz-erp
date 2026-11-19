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

export const MAX_GUEST_EMAILS = 10;

export class CreateLeadMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  guestName: string;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GUEST_EMAILS)
  @IsEmail({}, { each: true })
  @MaxLength(255, { each: true })
  guestEmails?: string[];
}
