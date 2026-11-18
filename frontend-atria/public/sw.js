// Service worker do Atria: mostra os avisos de push no sistema operacional.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

function readPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return {};
  }
}

const OPEN_CONVERSATION_QUERY = "whatsapp:open-conversation";
const OPEN_CONVERSATION_TIMEOUT_MS = 800;

// Pergunta à aba qual conversa do WhatsApp está aberta. Sem resposta a tempo,
// considera que não há conversa aberta e o aviso é mostrado.
function askOpenConversation(client) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), OPEN_CONVERSATION_TIMEOUT_MS);

    channel.port1.onmessage = (message) => {
      clearTimeout(timer);
      resolve(message.data?.phone ?? null);
    };
    client.postMessage({ type: OPEN_CONVERSATION_QUERY }, [channel.port2]);
  });
}

async function isConversationOpen(phone) {
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const visible = windows.filter(
    (client) => client.visibilityState === "visible",
  );
  const openPhones = await Promise.all(visible.map(askOpenConversation));
  return openPhones.includes(phone);
}

self.addEventListener("push", (event) => {
  const { title, body, url, tag, phone } = readPayload(event);

  event.waitUntil(
    (async () => {
      if (phone && (await isConversationOpen(phone))) return;

      await self.registration.showNotification(title || "Atria", {
        body: body || "",
        tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );

      if (existing) {
        await existing.focus();
        if ("navigate" in existing) await existing.navigate(target);
        return;
      }

      await self.clients.openWindow(target);
    })(),
  );
});
