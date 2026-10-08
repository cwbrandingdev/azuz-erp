import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendWhatsAppMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message: string;
}
