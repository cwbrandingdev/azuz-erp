import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendWhatsappMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  body: string;
}
