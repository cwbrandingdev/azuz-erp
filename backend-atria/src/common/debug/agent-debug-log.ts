import { appendFileSync } from 'fs';

const LOG_PATH =
  '/home/arthur-marinho/Desktop/Developer/azuz-erp/.cursor/debug-e1daf0.log';
const ENDPOINT =
  'http://127.0.0.1:7796/ingest/d0e4e72f-da91-4dd1-9779-2825ee7f66bc';

export function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  const payload = {
    sessionId: 'e1daf0',
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
  };
  // #region agent log
  try {
    appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    // ignore when path unavailable (e.g. remote container)
  }
  fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'e1daf0',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `***${digits.slice(-4)}`;
}
