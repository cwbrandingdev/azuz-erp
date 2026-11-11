import { Transform } from 'class-transformer';
import { IsEntityId } from '../../common/validation/entity-id';
import { firstQueryValue } from '../../common/validation/query-param';

export class ProspectingLeadsQueryDto {
  @Transform(({ value }) => firstQueryValue(value))
  @IsEntityId({ optional: true })
  organizationId?: string;

  @Transform(({ value }) => firstQueryValue(value))
  @IsEntityId({ optional: true })
  ownerUserId?: string;
}
