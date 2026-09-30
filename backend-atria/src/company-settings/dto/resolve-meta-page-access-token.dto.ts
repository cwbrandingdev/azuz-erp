import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResolveMetaPageAccessTokenDto {
  @IsString()
  @MinLength(10)
  accessToken: string;

  @IsOptional()
  @IsString()
  pageId?: string;
}
