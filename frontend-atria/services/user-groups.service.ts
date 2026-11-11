import { apiRequest } from "./api";
import type {
  UpdateUserGroupInput,
  UserGroup,
} from "./types";

export async function getUserGroups(): Promise<UserGroup[]> {
  return apiRequest<UserGroup[]>("/user-groups");
}

export async function updateUserGroup(
  id: string,
  data: UpdateUserGroupInput,
): Promise<UserGroup> {
  return apiRequest<UserGroup>(`/user-groups/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteUserGroup(id: string): Promise<void> {
  return apiRequest<void>(`/user-groups/${id}`, { method: "DELETE" });
}

export async function addGroupMembers(
  id: string,
  memberIds: string[],
): Promise<UserGroup> {
  return apiRequest<UserGroup>(`/user-groups/${id}/members`, {
    method: "PATCH",
    body: { memberIds },
  });
}
