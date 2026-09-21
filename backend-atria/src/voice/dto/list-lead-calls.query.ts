import { IsEntityId } from '../../common/validation/entity-id';

export class ListLeadCallsQueryDto {
  @IsEntityId()
  leadId: string;
}
