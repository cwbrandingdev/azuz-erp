const LEAD_CALL_LOGGED_EVENT = "atria:lead-call-logged";

export function emitLeadCallLogged() {
    window.dispatchEvent(new Event(LEAD_CALL_LOGGED_EVENT));
}

export function onLeadCallLogged(handler: () => void) {
    window.addEventListener(LEAD_CALL_LOGGED_EVENT, handler);
    return () => window.removeEventListener(LEAD_CALL_LOGGED_EVENT, handler);
}