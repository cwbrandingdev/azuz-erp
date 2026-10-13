import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class WhatsAppCopilotDto {
  @IsIn(['suggest', 'rewrite', 'grammar', 'tone', 'summarize'])
  action: 'suggest' | 'rewrite' | 'grammar' | 'tone' | 'summarize';

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  text?: string;

  @IsOptional()
  @IsIn(['formal', 'casual', 'empathetic'])
  tone?: 'formal' | 'casual' | 'empathetic';
}
