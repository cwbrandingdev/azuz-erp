import { apiRequest } from "./api";
import type {
  ClientGroup,
  UpdateClientGroupInput,
} from "./types";

export async function getClientGroups(): Promise<ClientGroup[]> {
  return apiRequest<ClientGroup[]>("/client-groups");
}

export async function updateClientGroup(
  id: string,
  data: UpdateClientGroupInput,
): Promise<ClientGroup> {
  return apiRequest<ClientGroup>(`/client-groups/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteClientGroup(id: string): Promise<void> {
  return apiRequest<void>(`/client-groups/${id}`, { method: "DELETE" });
}
