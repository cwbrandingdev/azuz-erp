import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCrmReminderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsDateString()
  dueDate: string;
}
