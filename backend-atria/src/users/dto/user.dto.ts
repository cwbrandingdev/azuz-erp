import {
  IsArray,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RoleName } from '@prisma/client';
import { IsEntityId } from '../../common/validation/entity-id';

export class CreateUserGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds?: string[];
}

export class UpdateUserGroupDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;
}

export class ProvisionUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(RoleName)
  role: RoleName;

  @IsString()
  @IsOptional()
  @IsUUID()
  userGroupId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userGroupIds?: string[];

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalary?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  emailDomain?: string;

  /** Required when role is CLIENT — links the user to their company */
  @ValidateIf((o: ProvisionUserDto) =>
    o.role === RoleName.CLIENT || o.role === RoleName.EXTERNAL_CLIENT_CRM,
  )
  @IsEntityId()
  clientId?: string;

  /** Optional explicit email (used for CLIENT portal accounts) */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  /** CRM role: client organizations this user can access */
  @ValidateIf((o: ProvisionUserDto) => o.role === RoleName.CRM)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  crmScopeClientIds?: string[];

  /** CRM role: include internal leads (organizationId null) */
  @ValidateIf((o: ProvisionUserDto) => o.role === RoleName.CRM)
  @IsOptional()
  crmIncludeInternal?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  userGroupId?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userGroupIds?: string[];

  @IsEnum(RoleName)
  @IsOptional()
  role?: RoleName;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalary?: number | null;

  @IsOptional()
  @ValidateIf(
    (o: UpdateUserDto) =>
      o.role === RoleName.CLIENT ||
      o.role === RoleName.EXTERNAL_CLIENT_CRM ||
      (o.clientId !== undefined && o.clientId !== null),
  )
  @IsEntityId()
  clientId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  avatarUrl?: string | null;

  @ValidateIf((o: UpdateUserDto) => o.role === RoleName.CRM)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  crmScopeClientIds?: string[];

  @ValidateIf((o: UpdateUserDto) => o.role === RoleName.CRM)
  @IsOptional()
  crmIncludeInternal?: boolean;
}

export class AddUserGroupMembersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds: string[];
}
