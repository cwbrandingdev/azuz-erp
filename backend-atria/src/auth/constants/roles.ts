import { RoleName } from '@prisma/client';

export const INTERNAL_STAFF_ROLES = [
  RoleName.MASTER,
  RoleName.ADMIN,
  RoleName.DESIGNER_MASTER,
  RoleName.DESIGNER_JUNIOR,
  RoleName.CRM,
] as const;

export const USER_MANAGEMENT_ROLES = [
  RoleName.MASTER,
  RoleName.ADMIN,
] as const;

export const CLIENT_DIRECTORY_ROLES = [
  RoleName.MASTER,
  RoleName.ADMIN,
  RoleName.CRM,
] as const;

export const CLIENT_LOOKUP_ROLES = [
  ...CLIENT_DIRECTORY_ROLES,
  RoleName.DESIGNER_MASTER,
  RoleName.DESIGNER_JUNIOR,
] as const;

export const KANBAN_TASK_CREATE_ROLES = [
  RoleName.MASTER,
  RoleName.ADMIN,
  RoleName.DESIGNER_MASTER,
  RoleName.DESIGNER_JUNIOR,
] as const;

export const DELIVERABLE_ACCESS_ROLES = [
  ...KANBAN_TASK_CREATE_ROLES,
  RoleName.CLIENT,
] as const;
