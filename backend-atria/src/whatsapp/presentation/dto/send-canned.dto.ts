import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendCannedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to: string;

  @IsString()
  @IsNotEmpty()
  cannedId: string;
}
