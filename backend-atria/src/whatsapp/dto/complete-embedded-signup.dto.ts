import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteEmbeddedSignupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(4000)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  wabaId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  phoneNumberId: string;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  pin?: string;
}
