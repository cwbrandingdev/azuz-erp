import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMediaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}
