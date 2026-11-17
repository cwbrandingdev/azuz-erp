import { apiRequest } from "./api";

export async function getPublicKey() {
  return apiRequest<{ publicKey: string | null }>("/push/public-key", {
    skipToast: true,
  });
}

export async function subscribe(data: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  return apiRequest<{ success: boolean }>("/push/subscriptions", {
    method: "POST",
    body: data,
  });
}

export async function unsubscribe(endpoint: string) {
  return apiRequest<{ success: boolean }>("/push/unsubscribe", {
    method: "POST",
    body: { endpoint },
    skipToast: true,
  });
}
