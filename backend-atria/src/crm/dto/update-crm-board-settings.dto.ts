import { IsBoolean } from 'class-validator';
import { IsEntityId } from '../../common/validation/entity-id';

export class CrmBoardSettingsQueryDto {
  @IsEntityId({ optional: true })
  organizationId?: string;
}

export class UpdateCrmBoardSettingsDto {
  @IsBoolean()
  showOrcamento: boolean;

  @IsEntityId({ optional: true })
  organizationId?: string;
}
