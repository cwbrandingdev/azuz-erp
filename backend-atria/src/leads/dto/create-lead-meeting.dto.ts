import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
}
