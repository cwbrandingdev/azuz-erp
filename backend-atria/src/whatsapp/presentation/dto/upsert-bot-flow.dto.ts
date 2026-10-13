import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class BotFlowOptionDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  nextId?: string | null;
}

export class BotFlowNodeDto {
  @IsString()
  id: string;

  @IsIn(['message', 'menu', 'question', 'ai', 'handoff'])
  type: 'message' | 'menu' | 'question' | 'ai' | 'handoff';

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BotFlowOptionDto)
  options?: BotFlowOptionDto[];

  @IsOptional()
  @IsString()
  nextId?: string | null;
}

export class BotFlowDefinitionDto {
  @IsString()
  startId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BotFlowNodeDto)
  nodes: BotFlowNodeDto[];
}

export class UpsertBotFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BotFlowDefinitionDto)
  definition?: BotFlowDefinitionDto;
}
