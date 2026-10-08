import { ArrayMinSize, IsArray } from 'class-validator';
import { IsEntityId } from '../../common/validation/entity-id';

export class ReorderDeliverableItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEntityId({ each: true })
  itemIds: string[];
}
