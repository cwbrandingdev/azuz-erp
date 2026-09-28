import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  KanbanTaskContentType,
  KanbanTaskPriority,
  KanbanTaskStatus,
  ProductionPhase,
} from '@prisma/client';
import {
  IsEntityId,
  ToUpperEnum,
} from '../../common/validation/entity-id';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  postCaption?: string;

  @IsEntityId({ optional: true })
  columnId?: string;

  @ToUpperEnum()
  @IsEnum(KanbanTaskContentType)
  @IsOptional()
  contentType?: KanbanTaskContentType;

  @ToUpperEnum()
  @IsEnum(KanbanTaskPriority)
  @IsOptional()
  priority?: KanbanTaskPriority;

  @ToUpperEnum()
  @IsEnum(KanbanTaskStatus)
  @IsOptional()
  status?: KanbanTaskStatus;

  @ToUpperEnum()
  @IsEnum(ProductionPhase)
  @IsOptional()
  productionPhase?: ProductionPhase;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  publicationDate?: string;

  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @IsOptional()
  @IsArray()
  @IsEntityId({ each: true })
  assigneeIds?: string[];

  @IsEntityId({ optional: true })
  assignedGroupId?: string;

  @IsEntityId({ optional: true })
  clientId?: string;

  @IsEntityId({ optional: true })
  contentPostId?: string;

  @IsEntityId({ optional: true })
  calendarEventId?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  referenceUrl?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  postCaption?: string;

  @IsEntityId({ optional: true })
  columnId?: string;

  @ToUpperEnum()
  @IsEnum(KanbanTaskContentType)
  @IsOptional()
  contentType?: KanbanTaskContentType;

  @ToUpperEnum()
  @IsEnum(KanbanTaskPriority)
  @IsOptional()
  priority?: KanbanTaskPriority;

  @ToUpperEnum()
  @IsEnum(KanbanTaskStatus)
  @IsOptional()
  status?: KanbanTaskStatus;

  @ToUpperEnum()
  @IsEnum(ProductionPhase)
  @IsOptional()
  productionPhase?: ProductionPhase;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsDateString()
  @IsOptional()
  publicationDate?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsDateString()
  @IsOptional()
  deliveryDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null) return [];
    if (Array.isArray(value)) return value;
    return undefined;
  })
  @IsArray()
  @IsEntityId({ each: true })
  assigneeIds?: string[];

  @IsEntityId({ optional: true })
  assignedGroupId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsEntityId({ optional: true })
  clientId?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  referenceUrl?: string | null;
}

export class MoveTaskDto {
  @IsEntityId()
  columnId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  order: number;
}

export class UpdateTaskStatusDto {
  @ToUpperEnum()
  @IsEnum(KanbanTaskStatus)
  status: KanbanTaskStatus;
}

export class BulkDeleteTaskAssetsDto {
  @IsArray()
  @IsEntityId({ each: true })
  assetIds: string[];
}

export class QueryTasksDto {
  @IsEntityId({ optional: true })
  columnId?: string;

  @IsEntityId({ optional: true })
  clientId?: string;

  @IsEntityId({ optional: true })
  organizationId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
