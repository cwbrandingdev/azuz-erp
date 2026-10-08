import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCannedResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  shortCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  content: string;
}
