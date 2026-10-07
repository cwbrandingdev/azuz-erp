import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWhatsappConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
