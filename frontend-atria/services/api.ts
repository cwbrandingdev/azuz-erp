import {
  clearAuthStorage,
  getAccessToken,
  isRememberedSession,
  setAccessToken,
  setStoredUser,
} from "@/lib/auth-storage";
import { resolveApiBaseUrl } from "@/lib/api-url";
import { showApiError, shouldShowApiErrorToast } from "@/lib/toast";
import type { AuthResponse } from "@/services/types";

const API_BASE_URL = resolveApiBaseUrl();

export { API_BASE_URL };

const API_FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = API_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

const AUTH_PROXY_ENDPOINTS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/signup-with-token",
]);

function resolveRequestUrl(endpoint: string): string {
  if (AUTH_PROXY_ENDPOINTS.has(endpoint)) {
    return `/api${endpoint}`;
  }
  return `${API_BASE_URL}${endpoint}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  skipToast?: boolean;
  timeoutMs?: number;
};

let refreshPromise: Promise<AuthResponse | null> | null = null;

/** Single-flight refresh shared by API 401 retries and AuthProvider. */
export async function refreshAuthSession(): Promise<AuthResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetchWithTimeout(resolveRequestUrl("/auth/refresh"), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as AuthResponse;
        const remember = isRememberedSession();
        setAccessToken(data.accessToken, remember);
        setStoredUser(data.user, remember);
        return data;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function refreshAccessToken(): Promise<string | null> {
  const session = await refreshAuthSession();
  return session?.accessToken ?? null;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, skipAuth, skipToast, timeoutMs, ...rest } = options;

  const makeRequest = async (token: string | null) => {
    return fetchWithTimeout(
      resolveRequestUrl(endpoint),
      {
        ...rest,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      timeoutMs,
    );
  };

  let token = skipAuth ? null : getAccessToken();
  let response = await makeRequest(token);

  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      response = await makeRequest(token);
    } else {
      clearAuthStorage();
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { message?: string | string[] })?.message ?? "Request failed";
    const error = new ApiError(
      Array.isArray(message) ? message.join(", ") : message,
      response.status,
      data,
    );

    if (!skipToast && shouldShowApiErrorToast(response.status, endpoint, error.message)) {
      showApiError(error, endpoint);
    }

    throw error;
  }

  return data as T;
}

export async function apiRequestBlob(
  endpoint: string,
  options: Omit<RequestOptions, "body"> = {},
): Promise<Blob> {
  const { headers, skipAuth, skipToast, ...rest } = options;

  const makeRequest = async (token: string | null) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  };

  let token = skipAuth ? null : getAccessToken();
  let response = await makeRequest(token);

  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      response = await makeRequest(token);
    } else {
      clearAuthStorage();
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      (data as { message?: string | string[] })?.message ?? "Request failed";
    const error = new ApiError(
      Array.isArray(message) ? message.join(", ") : message,
      response.status,
      data,
    );

    if (!skipToast && shouldShowApiErrorToast(response.status, endpoint, error.message)) {
      showApiError(error, endpoint);
    }

    throw error;
  }

  return response.blob();
}

export type UploadProgressHandler = (percent: number) => void;

function sendFormData(
  url: string,
  formData: FormData,
  token: string | null,
  onProgress?: UploadProgressHandler,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        return;
      }
      onProgress(0);
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new ApiError("Upload failed", 0));
    xhr.onabort = () => reject(new ApiError("Upload cancelled", 0));
    xhr.send(formData);
  });
}

export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  options: {
    skipToast?: boolean;
    skipAuth?: boolean;
    onProgress?: UploadProgressHandler;
  } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const makeRequest = (token: string | null) =>
    sendFormData(url, formData, token, options.onProgress);

  let token = options.skipAuth ? null : getAccessToken();
  let result = await makeRequest(token);

  if (result.status === 401 && !options.skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      result = await makeRequest(token);
    } else {
      clearAuthStorage();
    }
  }

  const data = result.data;

  if (result.status < 200 || result.status >= 300) {
    const message =
      (data as { message?: string | string[] } | null)?.message ??
      "Upload failed";
    const error = new ApiError(
      Array.isArray(message) ? message.join(", ") : message,
      result.status,
      data,
    );

    if (
      !options.skipToast &&
      shouldShowApiErrorToast(result.status, endpoint, error.message)
    ) {
      showApiError(error, endpoint);
    }

    throw error;
  }

  return data as T;
}
