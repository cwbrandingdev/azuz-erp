import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWhatsAppNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message: string;
}
