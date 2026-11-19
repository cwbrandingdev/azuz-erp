"use client";

import { useEffect, useRef } from "react";

export const OPEN_WHATSAPP_CONVERSATION_QUERY = "whatsapp:open-conversation";

export function useReportOpenWhatsappConversation(phone: string | null) {
    const phoneRef = useRef(phone);

    useEffect(() => {
        phoneRef.current = phone;
    }, [phone]);

    useEffect(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        const container = navigator.serviceWorker;
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== OPEN_WHATSAPP_CONVERSATION_QUERY) return;
            event.ports[0]?.postMessage({ phone: phoneRef.current });
        };

        container.addEventListener("message", handleMessage);
        return () => container.removeEventListener("message", handleMessage);
    }, []);
}