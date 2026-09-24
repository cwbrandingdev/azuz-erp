/**
 * Live smoke + workflow test for /client-portal API (main app CLIENT login).
 * Usage: node scripts/test-client-portal-live.mjs
 * Requires backend on PORT (default 3001) and seeded E2E users.
 */
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const API = (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3001').replace(/\/$/, '');
const RUN_ID = `portal-live-${Date.now()}`;

const ADMIN = {
  email: 'e2e-admin@atria.test',
  password: 'E2eAdmin!Pass123',
};
const CLIENT = {
  email: 'e2e-client@atria.test',
  password: 'E2eClient!Pass123',
};
const DESIGNER_MASTER = {
  email: 'e2e-designer-master@atria.test',
  password: 'E2eDesignerMaster!Pass123',
};

const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function json(method, path, { token, body, expectStatus } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (expectStatus !== undefined && res.status !== expectStatus) {
    throw new Error(
      `${method} ${path} expected ${expectStatus}, got ${res.status}: ${text.slice(0, 300)}`,
    );
  }

  return { status: res.status, data };
}

async function login(email, password) {
  const { data } = await json('POST', '/auth/login', {
    body: { email, password },
    expectStatus: 200,
  });
  return data.accessToken;
}

async function main() {
  console.log(`Testing client portal against ${API}\n`);

  let adminToken;
  let designerToken;
  let clientToken;
  let clientId;
  let postApproveId;
  let postRejectId;
  let kanbanColumnId;

  try {
    adminToken = await login(ADMIN.email, ADMIN.password);
    record('POST /auth/login (admin)', true);
  } catch (e) {
    record('POST /auth/login (admin)', false, e.message);
    console.log('\nRun: npm run test:e2e:seed');
    printSummary();
    process.exit(1);
  }

  try {
    designerToken = await login(DESIGNER_MASTER.email, DESIGNER_MASTER.password);
    record('POST /auth/login (designer master)', true);
  } catch (e) {
    record('POST /auth/login (designer master)', false, e.message);
  }

  try {
    const login = await json('POST', '/auth/login', {
      body: { email: CLIENT.email, password: CLIENT.password },
      expectStatus: 200,
    });
    clientToken = login.data.accessToken;
    clientId = login.data.user?.clientId;
    record('POST /auth/login (client)', true);
    record(
      'Client login has clientId',
      Boolean(clientId),
      clientId ?? 'missing — run npm run test:e2e:seed',
    );
  } catch (e) {
    record('POST /auth/login (client)', false, e.message);
    printSummary();
    process.exit(1);
  }

  try {
    await json('GET', '/clients', { token: clientToken, expectStatus: 403 });
    record('GET /clients blocked for CLIENT', true);
  } catch (e) {
    record('GET /clients blocked for CLIENT', false, e.message);
  }

  if (!clientId) {
    printSummary();
    process.exit(1);
  }

  try {
    const cols = await json('GET', '/kanban/columns', {
      token: designerToken ?? adminToken,
      expectStatus: 200,
    });
    kanbanColumnId = cols.data?.[0]?.id;
    record('GET /kanban/columns', Boolean(kanbanColumnId));
  } catch (e) {
    record('GET /kanban/columns', false, e.message);
  }

  try {
    const created = await json('POST', '/content/posts', {
      token: designerToken ?? adminToken,
      body: {
        title: `Portal Approve ${RUN_ID}`,
        clientId,
        platform: 'INSTAGRAM',
        copy: 'Conteúdo para aprovação E2E',
      },
      expectStatus: 201,
    });
    postApproveId = created.data.id;

    if (kanbanColumnId) {
      const task = await json('POST', '/kanban/tasks', {
        token: designerToken ?? adminToken,
        body: {
          title: `Portal Task ${RUN_ID}`,
          columnId: kanbanColumnId,
          clientId,
          contentPostId: postApproveId,
        },
        expectStatus: 201,
      });

      const form = new FormData();
      form.append(
        'file',
        new Blob([Buffer.from('fake-png')], { type: 'image/png' }),
        'e2e-portal.png',
      );
      form.append('caption', 'Entrega E2E');

      const assetRes = await fetch(`${API}/kanban/tasks/${task.data.id}/assets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${designerToken ?? adminToken}` },
        body: form,
      });
      if (!assetRes.ok) {
        throw new Error(`asset upload ${assetRes.status}`);
      }

      await json('PATCH', `/content/posts/${postApproveId}/internal-review`, {
        token: designerToken ?? adminToken,
        body: { status: 'approved', note: 'ok' },
        expectStatus: 200,
      });
      await json('PATCH', `/kanban/tasks/${task.data.id}/internal-review`, {
        token: designerToken ?? adminToken,
        body: { status: 'approved', note: 'ok' },
        expectStatus: 200,
      });
    }

    record('Staff prepares post for client approval', Boolean(postApproveId));
  } catch (e) {
    record('Staff prepares post for client approval', false, e.message);
  }

  try {
    const created = await json('POST', '/content/posts', {
      token: designerToken ?? adminToken,
      body: {
        title: `Portal Reject ${RUN_ID}`,
        clientId,
        platform: 'INSTAGRAM',
        copy: 'Conteúdo para ajuste E2E',
        status: 'PENDING_APPROVAL',
      },
      expectStatus: 201,
    });
    postRejectId = created.data.id;
    record('Staff creates post pending rejection', Boolean(postRejectId));
  } catch (e) {
    record('Staff creates post pending rejection', false, e.message);
  }

  const clientRoutes = [
    ['GET', '/client-portal'],
    ['GET', '/client-portal/calendar'],
    ['GET', '/client-portal/finances'],
    ['GET', '/client-portal/requests'],
    ['GET', '/client-portal/deliverables'],
    ['GET', '/client-portal/financial/attachments'],
  ];

  for (const [method, path] of clientRoutes) {
    try {
      await json(method, path, { token: clientToken, expectStatus: 200 });
      record(`${method} ${path}`, true);
    } catch (e) {
      record(`${method} ${path}`, false, e.message);
    }
  }

  if (postApproveId) {
    try {
      const approved = await json('PATCH', `/client-portal/posts/${postApproveId}/approve`, {
        token: clientToken,
        expectStatus: 200,
      });
      record(
        'PATCH /client-portal/posts/:id/approve',
        approved.data?.status === 'approved' || approved.data?.status === 'APPROVED',
        String(approved.data?.status),
      );
    } catch (e) {
      record('PATCH /client-portal/posts/:id/approve', false, e.message);
    }
  }

  if (postRejectId) {
    try {
      const rejected = await json('PATCH', `/client-portal/posts/${postRejectId}/reject`, {
        token: clientToken,
        body: { rejectionReason: 'Ajustar cores e tipografia' },
        expectStatus: 200,
      });
      record(
        'PATCH /client-portal/posts/:id/reject (solicitar ajustes)',
        Boolean(rejected.data?.id ?? rejected.data?.status),
      );
    } catch (e) {
      record('PATCH /client-portal/posts/:id/reject', false, e.message);
    }
  }

  try {
    const req = await json('POST', '/client-portal/requests', {
      token: clientToken,
      body: {
        title: `Solicitação ${RUN_ID}`,
        description: 'Preciso de novos criativos para campanha',
        contentType: 'REDE_SOCIAL',
        referenceLinks: ['https://example.com/ref'],
        attachments: [],
      },
      expectStatus: 201,
    });
    record('POST /client-portal/requests', Boolean(req.data?.id));
  } catch (e) {
    record('POST /client-portal/requests', false, e.message);
  }

  try {
    const brief = await json('POST', '/client-portal/briefings', {
      token: clientToken,
      body: {
        title: `Briefing ${RUN_ID}`,
        content: 'Conteúdo do briefing enviado pelo cliente',
      },
      expectStatus: 201,
    });
    record('POST /client-portal/briefings', Boolean(brief.data?.id));
  } catch (e) {
    record('POST /client-portal/briefings', false, e.message);
  }

  printSummary();
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- Summary: ${passed} passed, ${failed} failed ---`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
