import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AnswerWhatsAppCallDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  sdp: string;
}
