#!/usr/bin/env node
/**
 * Comprehensive RBAC API tests against running backend (default :3001).
 * Provisions one user per role and validates key behaviors.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = process.env.QA_API_URL ?? 'http://localhost:3001';
const RUN_ID = process.env.QA_RUN_ID ?? `qa-${Date.now()}`;
const QA_PASSWORD = 'QaRoleTest!Pass123';

const ROLES = [
  'MASTER',
  'ADMIN',
  'DESIGNER_MASTER',
  'DESIGNER_JUNIOR',
  'CRM',
  'EXTERNAL_CLIENT_CRM',
  'CLIENT',
];

const results = [];

function record(section, name, role, steps, ok, expected, actual, notes = '') {
  results.push({
    section,
    name,
    role: role ?? 'ALL',
    steps,
    result: ok ? 'PASS' : 'FAIL',
    expected,
    actual,
    notes,
  });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] [${section}] ${name}${role ? ` (${role})` : ''}: ${actual}`);
}

async function api(method, path, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let fetchBody;
  if (formData) {
    fetchBody = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: fetchBody });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json, ok: res.ok };
}

async function login(email, password) {
  const res = await api('POST', '/auth/login', { body: { email, password } });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.json)}`);
  return { token: res.json.accessToken, user: res.json.user };
}

async function main() {
  console.log(`\n=== QA RBAC API Tests ===`);
  console.log(`API: ${API}`);
  console.log(`Run ID: ${RUN_ID}\n`);

  // --- Auth: admin seed user ---
  let admin;
  try {
    admin = await login('e2e-admin@atria.test', 'E2eAdmin!Pass123');
    record(
      'Auth',
      'Login seeded ADMIN user',
      'ADMIN',
      'POST /auth/login with e2e-admin@atria.test',
      true,
      '200 + accessToken',
      `200 role=${admin.user.role}`,
    );
  } catch (err) {
    record(
      'Auth',
      'Login seeded ADMIN user',
      'ADMIN',
      'POST /auth/login',
      false,
      '200',
      err.message,
    );
    writeResults({ blocked: true });
    return;
  }

  // --- Get an active client for CLIENT roles / kanban tasks ---
  const clientsRes = await api('GET', '/clients?activeOnly=true', { token: admin.token });
  let clientId =
    clientsRes.json?.find((c) => c.isActive !== false)?.id ?? clientsRes.json?.[0]?.id;
  if (!clientId) {
    const createClient = await api('POST', '/clients', {
      token: admin.token,
      body: {
        companyName: `QA Client Co ${RUN_ID}`,
        contactName: 'QA Contact',
        email: `qa.client.${RUN_ID}@test.com`,
      },
    });
    clientId = createClient.json?.id;
  }

  if (!clientId) {
    record(
      'User provisioning',
      'Resolve clientId for portal users',
      'ALL',
      'GET/POST /clients',
      false,
      'client id',
      'Could not obtain clientId',
    );
  }

  const roleUsers = {};
  roleUsers.ADMIN = {
    email: 'e2e-admin@atria.test',
    password: 'E2eAdmin!Pass123',
    token: admin.token,
    userId: admin.user.id,
  };

  // --- Provision users for each role ---
  for (const role of ROLES) {
    if (role === 'ADMIN') continue;
    const email = `qa-${role.toLowerCase()}-${RUN_ID}@atria.test`;
    const payload = {
      name: `QA ${role} ${RUN_ID}`,
      role,
      password: QA_PASSWORD,
      email,
      ...(role === 'CLIENT' || role === 'EXTERNAL_CLIENT_CRM'
        ? { clientId }
        : {}),
    };

    const prov = await api('POST', '/users/provision', {
      token: admin.token,
      body: payload,
    });

    const ok = prov.status === 201;
    record(
      'User provisioning',
      `Provision ${role} user`,
      role,
      `POST /users/provision email=${email}`,
      ok,
      '201 Created',
      `${prov.status} ${prov.json?.user?.role ?? prov.json?.message ?? 'error'}`,
      ok ? `password=${QA_PASSWORD}` : JSON.stringify(prov.json?.message ?? prov.json).slice(0, 200),
    );

    if (ok) {
      try {
        const session = await login(email, QA_PASSWORD);
        roleUsers[role] = {
          email,
          password: QA_PASSWORD,
          token: session.token,
          userId: session.user.id,
        };
        record(
          'Auth',
          `Login provisioned ${role}`,
          role,
          `POST /auth/login`,
          true,
          '200',
          `200 role=${session.user.role}`,
        );
      } catch (err) {
        record(
          'Auth',
          `Login provisioned ${role}`,
          role,
          `POST /auth/login`,
          false,
          '200',
          err.message,
        );
      }
    }
  }

  // --- Login tests for seeded CLIENT ---
  try {
    const clientSession = await login('e2e-client@atria.test', 'E2eClient!Pass123');
    roleUsers.CLIENT_SEEDED = {
      email: 'e2e-client@atria.test',
      password: 'E2eClient!Pass123',
      token: clientSession.token,
      userId: clientSession.user.id,
    };
    record(
      'Auth',
      'Login seeded CLIENT user',
      'CLIENT',
      'POST /auth/login e2e-client@atria.test',
      true,
      '200',
      `200 role=${clientSession.user.role}`,
    );
  } catch (err) {
    record('Auth', 'Login seeded CLIENT user', 'CLIENT', 'POST /auth/login', false, '200', err.message);
  }

  // --- RBAC: staff routes blocked for CLIENT ---
  const clientToken = roleUsers.CLIENT_SEEDED?.token ?? roleUsers.CLIENT?.token;
  if (clientToken) {
    for (const [path, label] of [
      ['/clients', 'GET /clients'],
      ['/finance/transactions', 'GET /finance/transactions'],
      ['/users/members', 'GET /users/members'],
    ]) {
      const res = await api('GET', path, { token: clientToken });
      record(
        'RBAC/Kanban',
        `CLIENT blocked from ${label}`,
        'CLIENT',
        `${label} with CLIENT token`,
        res.status === 403,
        '403 Forbidden',
        `${res.status}`,
      );
    }

    const portal = await api('GET', '/client-portal', { token: clientToken });
    record(
      'Client portal',
      'CLIENT accesses portal dashboard',
      'CLIENT',
      'GET /client-portal',
      portal.status === 200,
      '200',
      `${portal.status}`,
    );
  }

  // --- Designers blocked from clients directory ---
  for (const role of ['DESIGNER_MASTER', 'DESIGNER_JUNIOR']) {
    const u = roleUsers[role];
    if (!u) continue;
    const clients = await api('GET', '/clients', { token: u.token });
    record(
      'Clients module',
      `${role} blocked from GET /clients`,
      role,
      'GET /clients',
      clients.status === 403,
      '403',
      `${clients.status}`,
    );
    const userClients = await api('GET', '/users/clients', { token: u.token });
    record(
      'Clients module',
      `${role} blocked from GET /users/clients`,
      role,
      'GET /users/clients',
      userClients.status === 403,
      '403',
      `${userClients.status}`,
    );
  }

  // --- CRM can access clients ---
  if (roleUsers.CRM) {
    const crmClients = await api('GET', '/clients', { token: roleUsers.CRM.token });
    record(
      'Clients module',
      'CRM can access GET /clients',
      'CRM',
      'GET /clients',
      crmClients.status === 200,
      '200',
      `${crmClients.status}`,
    );
  }

  // --- Kanban task setup ---
  const columnsRes = await api('GET', '/kanban/columns', { token: admin.token });
  const columnId = columnsRes.json?.[0]?.id;
  let unassignedTaskId;
  let assignedTaskId;

  if (columnId && clientId) {
    const createUnassigned = await api('POST', '/kanban/tasks', {
      token: admin.token,
      body: {
        title: `QA Unassigned ${RUN_ID}`,
        columnId,
        clientId,
      },
    });
    unassignedTaskId = createUnassigned.json?.id;

    const createAssigned = await api('POST', '/kanban/tasks', {
      token: admin.token,
      body: {
        title: `QA Assigned ${RUN_ID}`,
        columnId,
        clientId,
        assigneeIds: roleUsers.DESIGNER_JUNIOR ? [roleUsers.DESIGNER_JUNIOR.userId] : [],
      },
    });
    assignedTaskId = createAssigned.json?.id;

    record(
      'RBAC/Kanban',
      'Create test kanban tasks',
      'ADMIN',
      'POST /kanban/tasks x2',
      !!(unassignedTaskId && assignedTaskId),
      '201 task ids',
      `unassigned=${unassignedTaskId ?? 'fail'} assigned=${assignedTaskId ?? 'fail'}`,
    );
  }

  // --- DESIGNER_JUNIOR: read-only unassigned, edit assigned ---
  if (roleUsers.DESIGNER_JUNIOR && unassignedTaskId) {
    const patchUnassigned = await api('PATCH', `/kanban/tasks/${unassignedTaskId}`, {
      token: roleUsers.DESIGNER_JUNIOR.token,
      body: { title: `QA Junior edit unassigned ${RUN_ID}` },
    });
    record(
      'RBAC/Kanban',
      'DESIGNER_JUNIOR cannot edit unassigned task',
      'DESIGNER_JUNIOR',
      `PATCH /kanban/tasks/${unassignedTaskId}`,
      patchUnassigned.status === 403,
      '403',
      `${patchUnassigned.status}`,
    );
  }

  if (roleUsers.DESIGNER_JUNIOR && assignedTaskId) {
    const patchAssigned = await api('PATCH', `/kanban/tasks/${assignedTaskId}`, {
      token: roleUsers.DESIGNER_JUNIOR.token,
      body: { title: `QA Junior edit assigned ${RUN_ID}` },
    });
    record(
      'RBAC/Kanban',
      'DESIGNER_JUNIOR can edit assigned task',
      'DESIGNER_JUNIOR',
      `PATCH /kanban/tasks/${assignedTaskId}`,
      patchAssigned.status === 200,
      '200',
      `${patchAssigned.status}`,
    );
  }

  // --- DESIGNER_MASTER: edit any task ---
  if (roleUsers.DESIGNER_MASTER && unassignedTaskId) {
    const patchAny = await api('PATCH', `/kanban/tasks/${unassignedTaskId}`, {
      token: roleUsers.DESIGNER_MASTER.token,
      body: { title: `QA Master designer edit ${RUN_ID}` },
    });
    record(
      'RBAC/Kanban',
      'DESIGNER_MASTER can edit any task',
      'DESIGNER_MASTER',
      `PATCH /kanban/tasks/${unassignedTaskId}`,
      patchAny.status === 200,
      '200',
      `${patchAny.status}`,
    );
  }

  // --- Internal approval: MASTER + DESIGNER_MASTER (requires deliverable asset) ---
  if (unassignedTaskId && admin.token) {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('qa-deliverable')], { type: 'image/png' }), 'qa.png');
    form.append('caption', 'QA deliverable');
    const assetRes = await api('POST', `/kanban/tasks/${unassignedTaskId}/assets`, {
      token: admin.token,
      formData: form,
    });
    record(
      'RBAC/Kanban',
      'Upload deliverable before internal approval',
      'ADMIN',
      `POST /kanban/tasks/${unassignedTaskId}/assets`,
      assetRes.status === 201,
      '201',
      `${assetRes.status}`,
    );
  }

  if (unassignedTaskId) {
    for (const [role, expectStatus] of [
      ['MASTER', 200],
      ['DESIGNER_MASTER', 200],
      ['ADMIN', 403],
    ]) {
      const u = roleUsers[role];
      if (!u) {
        record(
          'RBAC/Kanban',
          `Internal approve blocked for ${role}`,
          role,
          'PATCH internal-review APPROVED',
          false,
          `${expectStatus}`,
          'User not provisioned',
          'Skipped — provision failed',
        );
        continue;
      }
      const res = await api('PATCH', `/kanban/tasks/${unassignedTaskId}/internal-review`, {
        token: u.token,
        body: { status: 'approved', note: `QA internal approve ${RUN_ID}` },
      });
      record(
        'RBAC/Kanban',
        expectStatus === 200
          ? `${role} can internal-approve task`
          : `${role} cannot internal-approve`,
        role,
        `PATCH /kanban/tasks/:id/internal-review APPROVED`,
        res.status === expectStatus,
        `${expectStatus}`,
        `${res.status} ${JSON.stringify(res.json?.message ?? '').slice(0, 120)}`,
      );
    }
  }

  // --- Sidebar/route API probes per role ---
  const pipelineQuery = clientId
    ? `?clientId=${clientId}&from=2026-01-01&to=2026-12-31`
    : '';

  const routeChecks = [
    { path: '/dashboard/overview', label: 'Dashboard overview', roles: ['MASTER', 'ADMIN'] },
    { path: '/kanban/columns', label: 'Kanban columns', roles: ['DESIGNER_MASTER', 'DESIGNER_JUNIOR'] },
    { path: '/leads', label: 'Leads', roles: ['CRM'] },
    { path: '/finance/transactions', label: 'Finance', roles: ['ADMIN', 'MASTER'] },
    {
      path: `/creation/pipeline${pipelineQuery}`,
      label: 'Creation pipeline',
      roles: ['ADMIN', 'DESIGNER_MASTER'],
    },
  ];

  for (const check of routeChecks) {
    for (const role of check.roles) {
      const u = roleUsers[role];
      if (!u) continue;
      const res = await api('GET', check.path, { token: u.token });
      record(
        'Other routes',
        `${role} ${check.label} API`,
        role,
        `GET ${check.path}`,
        res.status < 400,
        '2xx/3xx',
        `${res.status}`,
      );
    }
  }

  // --- Wrong password ---
  const badLogin = await api('POST', '/auth/login', {
    body: { email: 'e2e-admin@atria.test', password: 'wrong-password-qa' },
  });
  record(
    'Auth',
    'Invalid password rejected',
    'ALL',
    'POST /auth/login wrong password',
    badLogin.status === 401,
    '401',
    `${badLogin.status}`,
  );

  writeResults({ roleUsers, runId: RUN_ID, clientId });
}

function writeResults(extra) {
  const outDir = join(__dirname, '..', 'qa-artifacts');
  mkdirSync(outDir, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    api: API,
    runId: extra.runId ?? RUN_ID,
    passed: results.filter((r) => r.result === 'PASS').length,
    failed: results.filter((r) => r.result === 'FAIL').length,
    skipped: results.filter((r) => r.result === 'SKIP').length,
    total: results.length,
    roleUsers: extra.roleUsers
      ? Object.fromEntries(
          Object.entries(extra.roleUsers).map(([k, v]) => [
            k,
            { email: v.email, password: v.password },
          ]),
        )
      : {},
    results,
    ...extra,
  };
  writeFileSync(join(outDir, 'rbac-api-results.json'), JSON.stringify(summary, null, 2));
  console.log(`\n=== RBAC API SUMMARY: PASS=${summary.passed} FAIL=${summary.failed} ===`);
  writeFileSync(join(outDir, 'role-users.json'), JSON.stringify(summary.roleUsers, null, 2));
}

main().catch((err) => {
  console.error(err);
  record('System', 'Script fatal error', 'ALL', 'run-qa-rbac-api.mjs', false, 'success', err.message);
  writeResults({});
  process.exit(1);
});
