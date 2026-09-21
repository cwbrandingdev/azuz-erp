import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsEntityId } from '../../common/validation/entity-id';

export class CreateLeadCallDto {
  @IsEntityId()
  leadId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
