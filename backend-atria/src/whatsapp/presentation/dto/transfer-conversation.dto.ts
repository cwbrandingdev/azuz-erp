import { IsOptional, IsString, MinLength } from 'class-validator';

export class TransferConversationDto {
  @IsString()
  @MinLength(8, { message: 'A nota de contexto é obrigatória' })
  note: string;

  @IsOptional()
  @IsString()
  targetUserId?: string | null;

  @IsOptional()
  @IsString()
  targetUserGroupId?: string | null;
}
