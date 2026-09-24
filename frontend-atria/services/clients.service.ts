import { apiRequest } from "./api";
import type {
  Client,
  Client360Data,
  Client360Section,
  ClientAccessBundle,
  CreateClientInput,
  CreateClientResult,
  UpdateClientInput,
} from "./types";

export interface GetClientsOptions {
  clientGroupId?: string;
  activeOnly?: boolean;
}

export async function getClients(
  options?: string | GetClientsOptions,
): Promise<Client[]> {
  const params = new URLSearchParams();

  if (typeof options === "string") {
    if (options) {
      params.set("clientGroupId", options);
    }
  } else if (options) {
    if (options.clientGroupId) {
      params.set("clientGroupId", options.clientGroupId);
    }
    if (options.activeOnly) {
      params.set("activeOnly", "true");
    }
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<Client[]>(`/clients${query}`);
}

export async function getClient(id: string): Promise<Client> {
  return apiRequest<Client>(`/clients/${id}`);
}

export async function getClient360<T extends Client360Data = Client360Data>(
  id: string,
  section: Client360Section = "summary",
): Promise<T> {
  return apiRequest<T>(`/clients/${id}/360?section=${section}`);
}

export async function getClientAccess(id: string): Promise<ClientAccessBundle> {
  return apiRequest<ClientAccessBundle>(`/clients/${id}/access`);
}

export async function createClient(data: CreateClientInput): Promise<CreateClientResult> {
  return apiRequest<CreateClientResult>("/clients", {
    method: "POST",
    body: data,
  });
}

export async function updateClient(
  id: string,
  data: UpdateClientInput,
): Promise<Client> {
  return apiRequest<Client>(`/clients/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteClient(id: string): Promise<void> {
  return apiRequest<void>(`/clients/${id}`, { method: "DELETE" });
}

export async function deactivateClient(id: string): Promise<Client> {
  return apiRequest<Client>(`/clients/${id}/deactivate`, {
    method: "PATCH",
  });
}

export async function activateClient(id: string): Promise<Client> {
  return apiRequest<Client>(`/clients/${id}/activate`, {
    method: "PATCH",
  });
}

export async function bulkImportClients(clients: CreateClientInput[]) {
  return apiRequest<{ created: number; errors: { index: number; message: string }[] }>(
    "/clients/bulk",
    { method: "POST", body: { clients } },
  );
}
