import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

// Formato do `subscription.toJSON()` que o navegador devolve.
export class SubscribePushDto {
  @IsUrl()
  @MaxLength(2048)
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

export class UnsubscribePushDto {
  @IsUrl()
  @MaxLength(2048)
  endpoint: string;
}
