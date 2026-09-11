import { apiRequest, uploadFile } from "./api";
import type { ManagedUser, ProvisionUserInput, ProvisionUserResult } from "./types";

export async function getUsers(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>("/users");
}

export async function getMembers(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>("/users/members");
}

export async function getClients(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>("/users/clients");
}

export async function provisionUser(
  data: ProvisionUserInput,
): Promise<ProvisionUserResult> {
  return apiRequest<ProvisionUserResult>("/users/provision", {
    method: "POST",
    body: data,
  });
}

export async function deactivateUser(id: string) {
  return apiRequest<ManagedUser>(`/users/${id}/deactivate`, {
    method: "PATCH",
  });
}

export interface CompanyRepresentativeEntry {
  id: string;
  title: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  user: ManagedUser;
}

export async function getRepresentatives(): Promise<CompanyRepresentativeEntry[]> {
  return apiRequest<CompanyRepresentativeEntry[]>("/users/representatives");
}

export interface UpdateUserInput {
  email?: string;
  userGroupId?: string | null;
  role?:
    | "MASTER"
    | "ADMIN"
    | "DESIGNER_MASTER"
    | "DESIGNER_JUNIOR"
    | "CRM"
    | "EXTERNAL_CLIENT_CRM"
    | "CLIENT";
  monthlySalary?: number | null;
  clientId?: string | null;
  avatarUrl?: string | null;
  crmScopeClientIds?: string[];
  crmIncludeInternal?: boolean;
}

export async function updateUser(id: string, data: UpdateUserInput) {
  return apiRequest<ManagedUser>(`/users/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function uploadUserAvatar(userId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return uploadFile<ManagedUser>(`/users/${userId}/avatar`, formData);
}

export async function uploadMyAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return uploadFile<ManagedUser>("/users/me/avatar", formData);
}

export async function removeMyAvatar() {
  return apiRequest<ManagedUser>("/users/me/avatar/remove", {
    method: "POST",
    body: {},
  });
}

export async function removeUserAvatar(id: string) {
  return apiRequest<ManagedUser>(`/users/${id}/avatar`, {
    method: "DELETE",
  });
}
