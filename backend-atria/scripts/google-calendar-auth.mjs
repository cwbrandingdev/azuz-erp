import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axios from 'axios';
import dotenv from 'dotenv';

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/meetings.space.created',
].join(' ');
const envPath = resolve(process.cwd(), '.env');

dotenv.config({ path: envPath, quiet: true });

const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

function page(title, body) {
  return `<!doctype html><html><body style="font-family:sans-serif;padding:32px">
<h1>${title}</h1><p>${body}</p></body></html>`;
}

function saveRefreshToken(refreshToken) {
  const current = readFileSync(envPath, 'utf8');
  const line = `GOOGLE_REFRESH_TOKEN="${refreshToken.replaceAll('"', '')}"`;
  const next = current.match(/^GOOGLE_REFRESH_TOKEN=.*$/m)
    ? current.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line)
    : `${current.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, next);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    response.writeHead(302, { Location: authUrl.toString() });
    response.end();
    return;
  }

  if (url.pathname !== '/callback') {
    response.writeHead(404);
    response.end();
    return;
  }

  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page('Google recusou', oauthError));
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page('Sem código', 'O Google não devolveu o código de autorização.'));
    return;
  }

  try {
    const token = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const refreshToken = token.data?.refresh_token;
    if (!refreshToken) {
      response.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(
        page(
          'Sem refresh token',
          'O Google autorizou, mas não devolveu um refresh token. Feche e abra o link de novo.',
        ),
      );
      return;
    }
    saveRefreshToken(refreshToken);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(
      page(
        'Pronto',
        'O refresh token foi salvo. Pode fechar esta aba e voltar ao Cursor.',
      ),
    );
    console.log('REFRESH_TOKEN_SAVED');
    setTimeout(() => server.close(), 300);
  } catch (error) {
    const data = error.response?.data;
    const message =
      (typeof data?.error === 'string' && data.error) ||
      data?.error_description ||
      error.message;
    response.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page('Falha ao trocar o código', String(message)));
    console.log('TOKEN_EXCHANGE_FAILED', String(message));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OPEN_URL http://localhost:${PORT}/`);
  console.log(`REDIRECT_URI ${REDIRECT_URI}`);
});
