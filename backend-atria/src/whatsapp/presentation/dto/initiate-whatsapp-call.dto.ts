import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InitiateWhatsAppCallDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  sdp: string;
}
