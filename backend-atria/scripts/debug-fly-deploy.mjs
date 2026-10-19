/**
 * Collects flyctl / TLS / proxy / Docker-context evidence for Depot deploy failures.
 * Usage: node scripts/debug-fly-deploy.mjs
 */
import { execSync, spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { chmodSync, existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SESSION_ID = 'bb8dd4';
const INGEST =
  'http://127.0.0.1:7796/ingest/d0e4e72f-da91-4dd1-9779-2825ee7f66bc';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function sh(cmd) {
  try {
    return {
      ok: true,
      out: execSync(cmd, {
        encoding: 'utf8',
        timeout: 20_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      out: String(error.stdout || '').trim(),
      err: String(error.stderr || error.message).trim().slice(0, 800),
    };
  }
}

function dirSizeMb(path, skip = new Set()) {
  if (!existsSync(path)) return 0;
  let bytes = 0;
  const walk = (p) => {
    let entries;
    try {
      entries = readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = join(p, entry.name);
      try {
        if (entry.isDirectory()) walk(full);
        else bytes += statSync(full).size;
      } catch {
        /* ignore */
      }
    }
  };
  walk(path);
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

const RUN_ID = process.argv.includes('--ipv4-push')
  ? 'post-fix'
  : process.argv.includes('--local-only') ||
      process.argv.includes('--recreate-builder') ||
      process.argv.includes('--depot-false')
    ? 'post-fix'
    : 'pre-fix';

async function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: SESSION_ID,
    runId: RUN_ID,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  await fetch(INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
  console.log(`[${hypothesisId}] ${message}`, JSON.stringify(data).slice(0, 500));
}

const flyctl = sh('flyctl version || fly version');
await log('C', 'debug-fly-deploy.mjs:flyctl', 'flyctl version', flyctl);

const openssl = sh('openssl version');
await log('E', 'debug-fly-deploy.mjs:openssl', 'openssl version', openssl);

const proxyEnv = {
  http_proxy: process.env.http_proxy || null,
  https_proxy: process.env.https_proxy || null,
  HTTP_PROXY: process.env.HTTP_PROXY || null,
  HTTPS_PROXY: process.env.HTTPS_PROXY || null,
  ALL_PROXY: process.env.ALL_PROXY || null,
  SSL_CERT_FILE: process.env.SSL_CERT_FILE || null,
  NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS || null,
  GODEBUG: process.env.GODEBUG || null,
};
await log('B', 'debug-fly-deploy.mjs:proxy', 'proxy and TLS env (no secrets)', {
  proxyEnv,
});

const context = {
  totalMb: dirSizeMb(ROOT, new Set(['node_modules', '.env', 'uploads'])),
  distMb: dirSizeMb(join(ROOT, 'dist')),
  nodeModulesMb: dirSizeMb(join(ROOT, 'node_modules')),
  dockerignoreHasDist: existsSync(join(ROOT, '.dockerignore'))
    ? (await import('node:fs')).readFileSync(join(ROOT, '.dockerignore'), 'utf8').includes('dist')
    : false,
};
await log('D', 'debug-fly-deploy.mjs:context', 'docker context size', context);

function tlsProbe(host, minProto) {
  const args = [
    's_client',
    '-connect',
    `${host}:443`,
    '-servername',
    host,
    minProto,
    '-brief',
  ];
  const result = spawnSync('openssl', args, {
    encoding: 'utf8',
    timeout: 12_000,
    input: '',
  });
  const blob = `${result.stdout || ''}\n${result.stderr || ''}`;
  const protocol = blob.match(/Protocol version: (\S+)/)?.[1] || blob.match(/Protocol\s*:\s*(\S+)/)?.[1] || null;
  const cipher = blob.match(/Ciphersuite: (\S+)/)?.[1] || blob.match(/Cipher\s*:\s*(\S+)/)?.[1] || null;
  return {
    ok: result.status === 0,
    protocol,
    cipher,
    snippet: blob
      .split('\n')
      .filter((line) => /Protocol|Cipher|error|alert|CONNECTED|Verify/i.test(line))
      .slice(0, 12),
  };
}

const hosts = ['api.fly.io', 'depot.dev', 'registry.fly.io'];
for (const host of hosts) {
  const tls12 = tlsProbe(host, '-tls1_2');
  const tls13 = tlsProbe(host, '-tls1_3');
  await log('E', `debug-fly-deploy.mjs:tls:${host}`, `TLS probe ${host}`, {
    host,
    tls12,
    tls13,
  });
}

const status = sh('fly status -a atria-backend-broken-night-9242 --json 2>/dev/null | head -c 4000');
await log('A', 'debug-fly-deploy.mjs:status', 'fly app status snippet', {
  ok: status.ok,
  hasMachines: /"id"/.test(status.out || ''),
  err: status.err?.slice(0, 300) || null,
});

const docker = sh("docker version --format '{{.Server.Version}}'");
await log('G', 'debug-fly-deploy.mjs:docker', 'local docker daemon', docker);

const builders = sh("fly apps list --json");
let builderApps = [];
if (builders.ok) {
  try {
    const apps = JSON.parse(builders.out);
    builderApps = apps
      .filter((app) => /builder/i.test(app.Name || app.name || ''))
      .map((app) => ({
        name: app.Name || app.name,
        status: app.Status || app.status,
      }));
  } catch {
    builderApps = [{ parseError: true }];
  }
}
await log('F', 'debug-fly-deploy.mjs:builders', 'fly builder apps', {
  builderApps,
});

function curlHead(url, ipv) {
  const flag = ipv === 4 ? '-4' : '-6';
  return sh(
    `curl ${flag} -sI --max-time 10 ${url} | tr -d '\\r' | head -8`,
  );
}
const registryV4 = curlHead('https://registry.fly.io/v2/', 4);
const registryV6 = curlHead('https://registry.fly.io/v2/', 6);
await log('K', 'debug-fly-deploy.mjs:registry', 'registry.fly.io IPv4 vs IPv6 HEAD', {
  ipv4: registryV4,
  ipv6: registryV6,
});

function startIpv4Proxy() {
  const connects = [];
  const server = http.createServer((_req, res) => {
    res.writeHead(405);
    res.end();
  });
  server.on('connect', (req, clientSocket, head) => {
    const [host, portStr] = String(req.url || '').split(':');
    const port = Number(portStr || 443);
    connects.push({ host, port, family: 4 });
    const dest = net.connect({ host, port, family: 4 }, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head?.length) dest.write(head);
      dest.pipe(clientSocket);
      clientSocket.pipe(dest);
    });
    dest.on('error', (error) => {
      connects.push({ host, port, error: error.message });
      clientSocket.end();
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        connects,
        close: () => server.close(),
      });
    });
  });
}

function ensureCrane() {
  const bin = '/tmp/crane-bb8dd4';
  if (existsSync(bin)) return { ok: true, bin };
  const url =
    'https://github.com/google/go-containerregistry/releases/download/v0.20.6/go-containerregistry_Linux_x86_64.tar.gz';
  const download = spawnSync(
    'curl',
    ['-sL', '--fail', '--max-time', '120', '-o', '/tmp/crane-bb8dd4.tgz', url],
    { encoding: 'utf8' },
  );
  if (download.status !== 0) {
    return { ok: false, err: download.stderr || download.stdout || 'curl failed' };
  }
  const extract = spawnSync(
    'tar',
    ['-xzf', '/tmp/crane-bb8dd4.tgz', '-C', '/tmp', 'crane'],
    { encoding: 'utf8' },
  );
  if (extract.status !== 0) {
    return { ok: false, err: extract.stderr || 'tar failed' };
  }
  renameSync('/tmp/crane', bin);
  chmodSync(bin, 0o755);
  return { ok: true, bin };
}

function runCommand(command, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...opts.env },
    });
    let combined = '';
    const onData = (chunk) => {
      const text = chunk.toString();
      combined += text;
      process.stdout.write(text);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const timer = setTimeout(() => child.kill('SIGTERM'), opts.timeoutMs ?? 900_000);
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, combined });
    });
  });
}

if (process.argv.includes('--capture-deploy')) {
  const depotFalse = process.argv.includes('--depot-false');
  const localOnly = process.argv.includes('--local-only');
  const recreateBuilder = process.argv.includes('--recreate-builder');
  const ipv4Push = process.argv.includes('--ipv4-push');

  if (ipv4Push) {
    const proxy = await startIpv4Proxy();
    await log('K', 'debug-fly-deploy.mjs:proxy', 'started IPv4 CONNECT proxy', {
      port: proxy.port,
    });
    const crane = ensureCrane();
    await log('K', 'debug-fly-deploy.mjs:crane', 'crane binary', {
      ok: crane.ok,
      bin: crane.bin || null,
      err: crane.err?.slice(0, 300) || null,
    });
    const image = 'registry.fly.io/atria-backend-broken-night-9242:ipv4debug';
    const build = await runCommand('docker', ['build', '-t', image, '.'], {
      timeoutMs: 900_000,
    });
    await log('K', 'debug-fly-deploy.mjs:docker-build', 'local docker build', {
      exitCode: build.status,
      npmCiFailed: /npm ci.*did not complete successfully/i.test(build.combined),
      tail: build.combined.slice(-1200),
    });
    if (build.status === 0 && crane.ok) {
      spawnSync('fly', ['auth', 'docker'], { encoding: 'utf8', cwd: ROOT });
      const proxyUrl = `http://127.0.0.1:${proxy.port}`;
      const push = await runCommand(crane.bin, ['copy', `daemon:${image}`, image], {
        timeoutMs: 900_000,
        env: {
          HTTPS_PROXY: proxyUrl,
          HTTP_PROXY: proxyUrl,
          https_proxy: proxyUrl,
          http_proxy: proxyUrl,
          NO_PROXY: 'localhost,127.0.0.1,/var/run/docker.sock',
          no_proxy: 'localhost,127.0.0.1,/var/run/docker.sock',
        },
      });
      await log('K', 'debug-fly-deploy.mjs:crane-push', 'crane IPv4 proxy push', {
        exitCode: push.status,
        connects: proxy.connects.slice(0, 20),
        pushUsedIpv6: /write tcp \[[0-9a-f:]+\]:\d+->\[[0-9a-f:]+\]:443/i.test(
          push.combined,
        ),
        tail: push.combined.slice(-1500),
      });
      if (push.status === 0) {
        const deploy = await runCommand('fly', ['deploy', '--verbose', '--image', image], {
          timeoutMs: 900_000,
        });
        await log('K', 'debug-fly-deploy.mjs:deploy-image', 'fly deploy --image', {
          exitCode: deploy.status,
          usedDepot: /Building image with Depot/i.test(deploy.combined),
          tail: deploy.combined.slice(-1500),
        });
      }
    }
    proxy.close();
  } else {
    const args = ['deploy', '--verbose'];
    if (depotFalse) args.push('--depot=false');
    if (localOnly) args.push('--local-only');
    if (recreateBuilder) args.push('--recreate-builder');
    const deploy = await runCommand('fly', args, { timeoutMs: 900_000 });
    await log('J', 'debug-fly-deploy.mjs:deploy', 'fly deploy verbose capture', {
      exitCode: deploy.status,
      depotFalse,
      localOnly,
      recreateBuilder,
      usedDepot: /Building image with Depot/i.test(deploy.combined),
      usedFlyBuilder: /Waiting for remote builder|fly-builder-/i.test(deploy.combined),
      usedLocalDocker: /#\d+ \[build |docker daemon|Performing local build|building locally/i.test(
        deploy.combined,
      ),
      tlsProtocolError: /tls: protocol version not supported/i.test(deploy.combined),
      builderCantStart: /machine can't start at the moment/i.test(deploy.combined),
      prismaEconnreset: /@prisma\/engines[\s\S]{0,200}ECONNRESET/i.test(
        deploy.combined,
      ),
      npmCiFailed: /npm ci.*did not complete successfully/i.test(deploy.combined),
      registryReset: /registry\.fly\.io[\s\S]{0,400}connection reset by peer/i.test(
        deploy.combined,
      ),
      pushUsedIpv6: /write tcp \[[0-9a-f:]+\]:\d+->\[[0-9a-f:]+\]:443/i.test(
        deploy.combined,
      ),
      prismaBinariesProbe: deploy.combined.match(/DEBUG prisma-binaries[^\n]*/)?.[0] || null,
      contextTransferred: /transferring context:/.test(deploy.combined),
      tail: deploy.combined.slice(-2500),
    });
  }
}

console.log('Wrote fly deploy diagnostics to debug ingest.');
