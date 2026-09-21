import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AGENT_CALL_OUTCOMES } from '../voice.constants';

export class UpdateLeadCallDto {
  @IsOptional()
  @IsString()
  @IsIn([...AGENT_CALL_OUTCOMES])
  outcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
