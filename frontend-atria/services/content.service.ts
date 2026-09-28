import { apiRequest } from "./api";
import type {
  ContentCalendarItem,
  ContentManagementBoard,
  ContentOverview,
  ContentPost,
  CreateContentPostInput,
  CreatePostVersionInput,
  ContentPlatform,
  ContentPostStatus,
  PostHistory,
  PostInsights,
  PostVersion,
  RejectContentPostInput,
} from "./types";

export async function getManagementBoard(params?: {
  clientId?: string;
  status?: ContentPostStatus;
}) {
  const query = new URLSearchParams();
  if (params?.clientId) query.set("clientId", params.clientId);
  if (params?.status) query.set("status", params.status.toUpperCase());

  return apiRequest<ContentManagementBoard>(
    `/content/management${query.size ? `?${query.toString()}` : ""}`,
  );
}

export async function getOverview(clientId?: string): Promise<ContentOverview> {
  const query = clientId ? `?clientId=${clientId}` : "";
  return apiRequest<ContentOverview>(`/content/overview${query}`);
}

export async function getCalendar(params?: {
  from?: string;
  to?: string;
  clientId?: string;
}): Promise<ContentCalendarItem[]> {
  const query = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return apiRequest<ContentCalendarItem[]>(
    `/content/calendar${query ? `?${query}` : ""}`,
  );
}

export async function getPosts(params?: {
  clientId?: string;
  platform?: ContentPlatform;
  status?: ContentPostStatus;
  from?: string;
  to?: string;
}): Promise<ContentPost[]> {
  const entries = Object.entries(params ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [
      k,
      k === "platform" || k === "status" ? String(v).toUpperCase() : String(v),
    ]);

  const query = new URLSearchParams(entries).toString();

  return apiRequest<ContentPost[]>(
    `/content/posts${query ? `?${query}` : ""}`,
  );
}

export async function getPost(id: string): Promise<ContentPost> {
  return apiRequest<ContentPost>(`/content/posts/${id}`);
}

export async function getPostHistory(id: string): Promise<PostHistory> {
  return apiRequest<PostHistory>(`/content/posts/${id}/history`);
}

export async function getPostInsights(id: string): Promise<PostInsights> {
  return apiRequest<PostInsights>(`/content/posts/${id}/insights`);
}

export async function createPostVersion(
  id: string,
  data: CreatePostVersionInput,
): Promise<PostVersion> {
  return apiRequest<PostVersion>(`/content/posts/${id}/versions`, {
    method: "POST",
    body: data,
  });
}

export async function approvePost(id: string): Promise<ContentPost> {
  return apiRequest<ContentPost>(`/content/posts/${id}/approve`, {
    method: "PATCH",
  });
}

export async function rejectPost(
  id: string,
  data: RejectContentPostInput,
): Promise<ContentPost> {
  return apiRequest<ContentPost>(`/content/posts/${id}/reject`, {
    method: "PATCH",
    body: data,
  });
}

export async function createPost(
  data: CreateContentPostInput,
): Promise<ContentPost> {
  return apiRequest<ContentPost>("/content/posts", {
    method: "POST",
    body: {
      ...data,
      platform: data.platform.toUpperCase(),
      format: data.format?.toUpperCase(),
      status: data.status?.toUpperCase(),
    },
  });
}

export async function updatePost(
  id: string,
  data: Partial<CreateContentPostInput>,
): Promise<ContentPost> {
  const body: Record<string, unknown> = { ...data };
  if (data.platform) body.platform = data.platform.toUpperCase();
  if (data.format) body.format = data.format.toUpperCase();
  if (data.status) body.status = data.status.toUpperCase();

  return apiRequest<ContentPost>(`/content/posts/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deletePost(id: string): Promise<void> {
  return apiRequest<void>(`/content/posts/${id}`, { method: "DELETE" });
}

export async function publishPostToInstagram(id: string): Promise<ContentPost> {
  return apiRequest<ContentPost>(`/content/posts/${id}/publish-instagram`, {
    method: "POST",
  });
}
