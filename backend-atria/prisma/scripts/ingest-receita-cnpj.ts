/**
 * Ingest Receita Federal open CNPJ data into prospect_companies.
 *
 * Only keeps ATIVA + matriz + valid phone. Scores each row at insert time.
 *
 * Usage:
 *   npx ts-node prisma/scripts/ingest-receita-cnpj.ts
 *
 * Env:
 *   RECEITA_MONTH=2026-09     optional YYYY-MM folder
 *   RECEITA_UF=SP,PR          required; one UF at a time in memory
 *   RECEITA_PER_CNAE=100      max companies kept per CNAE per UF
 *   RECEITA_INSERT_BATCH=100  createMany size
 *   RECEITA_INSERT_PAUSE_MS=500  pause after each insert batch
 *   RECEITA_LIMIT=5000        optional extra overall cap (smoke test)
 *   RECEITA_DATA_DIR=/tmp/rfb reuse already downloaded zips
 *   RECEITA_SKIP_DOWNLOAD=1   never hit the Receita HTTP host
 */
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { Prisma, PrismaClient, ProspectFitVerdict } from '@prisma/client';
import { normalizeCatalogText } from '../../src/leads/company-lookup/domain/text-normalize';
import { qualifyRegistryCompany } from '../../src/leads/qualification/registry-company-qualifier';

const prisma = new PrismaClient();

const RFB_SHARE_TOKEN =
  process.env.RECEITA_SHARE_TOKEN?.trim() || 'YggdBLfdninEJX9';
const RFB_WEBDAV_URL = 'https://arquivos.receitafederal.gov.br/public.php/webdav';
const RFB_DAV_FILES_URL = `https://arquivos.receitafederal.gov.br/public.php/dav/files/${RFB_SHARE_TOKEN}/`;
const RFB_INDEX_URLS = [
  'https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/',
  'https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/',
];
const RFB_USER_AGENT = 'atria-erp-cnpj-ingest/1.0';

const SITUACAO_ATIVA = '02';
const MATRIZ = '1';
const PER_CNAE = positiveInt(process.env.RECEITA_PER_CNAE, 100);
const CREATE_BATCH = positiveInt(process.env.RECEITA_INSERT_BATCH, 100);
const INSERT_PAUSE_MS = Math.max(0, Number(process.env.RECEITA_INSERT_PAUSE_MS ?? '500') || 0);
const EXTRA_PAUSE_MS = Math.max(0, Number(process.env.RECEITA_EXTRA_PAUSE_MS ?? '3000') || 0);

interface EstablishmentRow {
  cnpj: string;
  cnpjBasico: string;
  tradeName: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string;
  cityNormalized: string;
  uf: string;
  postalCode: string | null;
  municipalityCode: string | null;
  address: string;
  primaryCnae: string;
  secondaryCnaes: string[];
  phone: string;
  email: string | null;
}

interface CompanyRow {
  legalName: string;
  shareCapital: number | null;
  companySize: string | null;
}

interface SimplesRow {
  isSimples: boolean;
  isMei: boolean;
}

async function main() {
  const ufs = parseUfs(process.env.RECEITA_UF);
  const limit = Number(process.env.RECEITA_LIMIT ?? '0');
  const dataDir =
    process.env.RECEITA_DATA_DIR?.trim() ||
    (await mkdtemp(join(tmpdir(), 'receita-cnpj-')));
  const skipDownload = process.env.RECEITA_SKIP_DOWNLOAD === '1';
  const log = makeLog('RFB');

  if (ufs.length === 0) {
    throw new Error('Defina RECEITA_UF=SP,PR — um estado por vez, no máximo 100 empresas por CNAE.');
  }

  await mkdir(dataDir, { recursive: true });
  await rm(join(dataDir, 'establishments.jsonl'), { force: true });
  log(`Início — pasta ${dataDir}`);
  log(
    `Teto ${PER_CNAE} por CNAE | grava ${CREATE_BATCH} e pausa ${INSERT_PAUSE_MS}ms` +
      (EXTRA_PAUSE_MS > 0 ? ` (+${EXTRA_PAUSE_MS}ms a cada 1.000)` : ''),
  );
  log(`Estados: ${ufs.join(', ')}`);

  let baseUrl = RFB_DAV_FILES_URL;
  let month = process.env.RECEITA_MONTH?.trim() || '';

  if (!skipDownload) {
    const resolved = await resolveMonthFolder();
    baseUrl = resolved.baseUrl;
    month = resolved.month;
    log(`Receita pasta: ${baseUrl}${month}/`);
    await downloadLookups(baseUrl, month, dataDir);
  } else {
    log('Etapa 1/5 — usando zips locais (sem download).');
  }

  log('Etapa 1/5 — carregando CNAEs e municípios.');
  const cnaes = await loadCodeTable(join(dataDir, 'Cnaes.zip'), dataDir);
  const municipios = await loadCodeTable(
    join(dataDir, 'Municipios.zip'),
    dataDir,
  );
  log(`CNAEs: ${cnaes.size} | Municípios: ${municipios.size}`);
  await persistCnaes(cnaes);
  await persistIbgeSubclasses();

  if (!skipDownload) {
    await downloadParts(baseUrl, month, dataDir, 'Estabelecimentos', 10);
    await downloadParts(baseUrl, month, dataDir, 'Empresas', 10);
    await downloadFileIfMissing(
      `${baseUrl}${month}/Simples.zip`,
      join(dataDir, 'Simples.zip'),
    );
  }

  for (const uf of ufs) {
    await ingestOneUf({
      uf,
      dataDir,
      cnaes,
      municipios,
      limit,
      log: makeLog(uf),
    });
  }

  if (!process.env.RECEITA_DATA_DIR) {
    await rm(dataDir, { recursive: true, force: true });
  }
}

function makeLog(label: string) {
  return (message: string) => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    console.log(`[${now}] [${label}] ${message}`);
  };
}

function parseUfs(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((part) => part.trim().toUpperCase())
    .filter((part) => /^[A-Z]{2}$/.test(part));
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw ?? '');
  return Number.isFinite(parsed) && parsed >= 1 ? Math.round(parsed) : fallback;
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function ingestOneUf(params: {
  uf: string;
  dataDir: string;
  cnaes: Map<string, string>;
  municipios: Map<string, string>;
  limit: number;
  log: (message: string) => void;
}) {
  const { uf, dataDir, cnaes, municipios, limit, log } = params;
  const jsonlPath = join(dataDir, `selected-${uf}.jsonl`);
  const out = createWriteStream(jsonlPath);
  const seenCnpjs = new Set<string>();
  const neededBasics = new Set<string>();
  const perCnae = new Map<string, number>();
  let matched = 0;
  let skippedFull = 0;

  log(`Etapa 2/5 — lendo estabelecimentos (matriz + ativa + telefone), teto ${PER_CNAE}/CNAE.`);
  for (let i = 0; i < 10; i += 1) {
    const zipPath = join(dataDir, `Estabelecimentos${i}.zip`);
    log(`Leitura ${i + 1}/10 — ${zipPath}`);
    const before = matched;
    await forEachReceitaLine(zipPath, async (cols) => {
      if (limit > 0 && matched >= limit) return;
      if (cols[3] !== MATRIZ || cols[5] !== SITUACAO_ATIVA) return;
      if ((cols[19] ?? '').trim().toUpperCase() !== uf) return;
      const cnae = (cols[11] ?? '').replace(/\D/g, '');
      if (!cnae) return;
      if ((perCnae.get(cnae) ?? 0) >= PER_CNAE) {
        skippedFull += 1;
        return;
      }
      const row = mapEstablishment(cols, municipios, uf);
      if (!row || seenCnpjs.has(row.cnpj)) return;
      seenCnpjs.add(row.cnpj);
      neededBasics.add(row.cnpjBasico);
      perCnae.set(cnae, (perCnae.get(cnae) ?? 0) + 1);
      matched += 1;
      if (!out.write(`${JSON.stringify(row)}\n`)) {
        await once(out, 'drain');
      }
      if (matched % 5_000 === 0) {
        log(
          `  ${matched.toLocaleString('pt-BR')} selecionadas / ${perCnae.size} CNAEs...`,
        );
      }
    });
    log(
      `Leitura ${i + 1}/10 concluída — +${(matched - before).toLocaleString('pt-BR')} nesta parte, total ${matched.toLocaleString('pt-BR')}.`,
    );
    if (limit > 0 && matched >= limit) {
      log(`Limite geral ${limit} atingido, parando a leitura.`);
      break;
    }
  }

  await new Promise<void>((resolve, reject) => {
    out.end((error) => (error ? reject(error) : resolve()));
  });

  log(
    `Etapa 2/5 concluída — ${matched.toLocaleString('pt-BR')} empresas em ${perCnae.size} CNAEs` +
      ` (${skippedFull.toLocaleString('pt-BR')} acima do teto).`,
  );

  if (matched === 0) {
    log('Nada para gravar.');
    await rm(jsonlPath, { force: true });
    return;
  }

  seenCnpjs.clear();
  perCnae.clear();
  collectGarbage();

  log('Etapa 3/5 — cruzando razão social e capital (Empresas).');
  const companies = new Map<string, CompanyRow>();
  const pendingCompanies = new Set(neededBasics);
  for (let i = 0; i < 10 && pendingCompanies.size > 0; i += 1) {
    const zipPath = join(dataDir, `Empresas${i}.zip`);
    log(`Empresas ${i + 1}/10 — ${zipPath}`);
    await forEachReceitaLine(
      zipPath,
      (cols) => {
        const cnpjBasico = cols[0]?.trim();
        if (!cnpjBasico || !pendingCompanies.has(cnpjBasico)) return;
        companies.set(cnpjBasico, {
          legalName: cols[1]?.trim() || cnpjBasico,
          shareCapital: parseCapital(cols[4]),
          companySize: cols[5]?.trim() || null,
        });
        pendingCompanies.delete(cnpjBasico);
      },
      {
        firstFieldFilter: pendingCompanies,
        shouldStop: () => pendingCompanies.size === 0,
      },
    );
    log(
      `Empresas ${i + 1}/10 concluída — ${companies.size.toLocaleString('pt-BR')} razões sociais` +
        (pendingCompanies.size === 0 ? ' (todas encontradas).' : '.'),
    );
  }

  log('Etapa 4/5 — cruzando Simples/MEI.');
  const simples = new Map<string, SimplesRow>();
  const pendingSimples = new Set(neededBasics);
  await forEachReceitaLine(
    join(dataDir, 'Simples.zip'),
    (cols) => {
      const cnpjBasico = cols[0]?.trim();
      if (!cnpjBasico || !pendingSimples.has(cnpjBasico)) return;
      simples.set(cnpjBasico, {
        isSimples: cols[1]?.trim().toUpperCase() === 'S',
        isMei: cols[4]?.trim().toUpperCase() === 'S',
      });
      pendingSimples.delete(cnpjBasico);
    },
    {
      firstFieldFilter: pendingSimples,
      shouldStop: () => pendingSimples.size === 0,
    },
  );
  log(`Etapa 4/5 concluída — ${simples.size.toLocaleString('pt-BR')} no Simples/MEI.`);

  const deleted = await prisma.prospectCompany.deleteMany({
    where: { uf, source: 'receita' },
  });
  if (deleted.count > 0) {
    log(`Limpou ${deleted.count.toLocaleString('pt-BR')} registros antigos de ${uf}.`);
  }

  log(`Etapa 5/5 — gravando ${matched.toLocaleString('pt-BR')} empresas no banco.`);
  let upserted = 0;
  const batch: Prisma.ProspectCompanyCreateManyInput[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    upserted += await flushCreates(batch);
    batch.length = 0;
    log(`Gravou ${upserted.toLocaleString('pt-BR')} / ${matched.toLocaleString('pt-BR')} — pausa ${INSERT_PAUSE_MS}ms.`);
    await sleep(INSERT_PAUSE_MS);
    if (EXTRA_PAUSE_MS > 0 && upserted % 1000 === 0) {
      log(`Respiro extra ${EXTRA_PAUSE_MS}ms após ${upserted.toLocaleString('pt-BR')}.`);
      await sleep(EXTRA_PAUSE_MS);
    }
  };

  const jsonlRead = createReadStream(jsonlPath, { encoding: 'utf8' });
  const lines = createInterface({ input: jsonlRead, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const establishment = JSON.parse(line) as EstablishmentRow;
    const company = companies.get(establishment.cnpjBasico);
    const tax = simples.get(establishment.cnpjBasico);
    const legalName = company?.legalName || establishment.tradeName || establishment.cnpj;
    const category =
      cnaes.get(establishment.primaryCnae) ?? establishment.primaryCnae;
    const qualification = qualifyRegistryCompany({
      name: establishment.tradeName || legalName,
      category,
      phone: establishment.phone,
      email: establishment.email,
      shareCapital: company?.shareCapital ?? null,
      isMei: tax?.isMei ?? false,
      companySize: company?.companySize ?? null,
    });

    batch.push({
      id: randomUUID(),
      cnpj: establishment.cnpj,
      legalName,
      tradeName: establishment.tradeName,
      phone: establishment.phone,
      email: establishment.email,
      street: establishment.street,
      number: establishment.number,
      neighborhood: establishment.neighborhood,
      neighborhoodNormalized: establishment.neighborhood
        ? normalizeCatalogText(establishment.neighborhood)
        : null,
      city: establishment.city,
      cityNormalized: establishment.cityNormalized,
      uf: establishment.uf,
      postalCode: establishment.postalCode,
      municipalityCode: establishment.municipalityCode,
      address: establishment.address,
      primaryCnae: establishment.primaryCnae,
      primaryCnaeDescription: category,
      secondaryCnaes: establishment.secondaryCnaes,
      shareCapital: company?.shareCapital ?? null,
      companySize: company?.companySize ?? null,
      isMei: tax?.isMei ?? false,
      isSimples: tax?.isSimples ?? false,
      registryScore: qualification.registryScore,
      commercialScore: qualification.commercialScore,
      blendedScore: qualification.blendedScore,
      verdict: qualification.verdict as ProspectFitVerdict,
      qualified: qualification.qualified,
      notes: qualification.notes,
      source: 'receita',
      ingestedAt: new Date(),
    });

    if (batch.length >= CREATE_BATCH) {
      await flush();
    }
  }

  await flush();
  await rm(jsonlPath, { force: true });
  log(`Concluído ${uf}: ${upserted.toLocaleString('pt-BR')} empresas gravadas.`);
}

async function persistCnaes(cnaes: Map<string, string>) {
  const data = Array.from(cnaes.entries())
    .map(([rawCode, description]) => {
      const code = rawCode.replace(/\D/g, '');
      if (!code || !description.trim()) {
        return null;
      }
      return {
        code,
        description: description.trim(),
        descriptionNormalized: normalizeCatalogText(description),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const extras = [
    {
      code: '9602502',
      description:
        'Atividades de estética e outros serviços de cuidados com a beleza',
    },
  ];
  for (const extra of extras) {
    if (!data.some((row) => row.code === extra.code)) {
      data.push({
        code: extra.code,
        description: extra.description,
        descriptionNormalized: normalizeCatalogText(extra.description),
      });
    }
  }

  if (data.length === 0) {
    return;
  }

  await prisma.prospectCnae.createMany({
    data,
    skipDuplicates: true,
  });
  console.log(`Stored ${data.length} CNAE subclasses.`);
}

async function persistIbgeSubclasses() {
  try {
    const response = await fetch(
      'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses',
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': RFB_USER_AGENT,
        },
      },
    );
    if (!response.ok) {
      console.warn(`IBGE subclasses skipped (${response.status}).`);
      return;
    }

    const payload = (await response.json()) as Array<{
      id?: string;
      descricao?: string;
    }>;
    const data = payload
      .map((item) => {
        const code = (item.id ?? '').replace(/\D/g, '');
        const description = prettyCnaeDescription(item.descricao ?? '');
        if (!code || !description) {
          return null;
        }
        return {
          code,
          description,
          descriptionNormalized: normalizeCatalogText(description),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    if (data.length === 0) {
      return;
    }

    await prisma.prospectCnae.createMany({
      data,
      skipDuplicates: true,
    });
    console.log(`Stored ${data.length} IBGE CNAE subclasses.`);
  } catch (error) {
    console.warn(`IBGE subclasses skipped: ${String(error)}`);
  }
}

function prettyCnaeDescription(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const lower = trimmed.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

async function flushCreates(batch: Prisma.ProspectCompanyCreateManyInput[]) {
  const result = await prisma.prospectCompany.createMany({
    data: [...batch],
    skipDuplicates: true,
  });
  return result.count;
}

function mapEstablishment(
  cols: string[],
  municipios: Map<string, string>,
  ufFilter: string | null,
): EstablishmentRow | null {
  if (cols[3] !== MATRIZ) return null;
  if (cols[5] !== SITUACAO_ATIVA) return null;

  const uf = cols[19]?.trim().toUpperCase();
  if (!uf || uf.length !== 2) return null;
  if (ufFilter && uf !== ufFilter) return null;

  const phone = normalizeBrPhone(cols[21], cols[22]) ?? normalizeBrPhone(cols[23], cols[24]);
  if (!phone) return null;

  const cnpjBasico = cols[0]?.trim();
  const ordem = cols[1]?.trim().padStart(4, '0');
  const dv = cols[2]?.trim().padStart(2, '0');
  if (!cnpjBasico || cnpjBasico.length !== 8) return null;
  const cnpj = `${cnpjBasico}${ordem}${dv}`;
  if (cnpj.length !== 14) return null;

  const municipalityCode = cols[20]?.trim() || null;
  const city =
    (municipalityCode ? municipios.get(municipalityCode) : null) ||
    municipalityCode ||
    uf;
  const street = [cols[13], cols[14]].filter(Boolean).join(' ').trim() || null;
  const number = cols[15]?.trim() || null;
  const neighborhood = cols[17]?.trim() || null;
  const postalCode = cols[18]?.replace(/\D/g, '') || null;
  const primaryCnae = (cols[11] ?? '').replace(/\D/g, '');
  if (!primaryCnae) return null;

  const secondaryCnaes = (cols[12] ?? '')
    .split(',')
    .map((code) => code.replace(/\D/g, ''))
    .filter((code) => code.length >= 5);

  const email = normalizeEmail(cols[27]);
  const address = [
    street,
    number,
    neighborhood,
    city,
    uf,
    postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    cnpj,
    cnpjBasico,
    tradeName: cols[4]?.trim() || null,
    street,
    number,
    neighborhood,
    city,
    cityNormalized: normalizeCatalogText(city),
    uf,
    postalCode,
    municipalityCode,
    address,
    primaryCnae,
    secondaryCnaes,
    phone,
    email,
  };
}

function normalizeBrPhone(ddd: string | undefined, number: string | undefined): string | null {
  const d = (ddd ?? '').replace(/\D/g, '');
  const n = (number ?? '').replace(/\D/g, '');
  if (d.length < 2 || n.length < 8 || n.length > 9) return null;
  if (/^0+$/.test(n) || /^0+$/.test(d)) return null;
  return `+55${d}${n}`;
}

function normalizeEmail(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return null;
  return trimmed.slice(0, 255);
}

function parseCapital(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function resolveMonthFolder(): Promise<{ baseUrl: string; month: string }> {
  const configured = process.env.RECEITA_MONTH?.trim();

  try {
    const months = await listMonthsViaWebdav();
    const month =
      configured && months.includes(configured)
        ? configured
        : months.at(-1);
    if (month) {
      return { baseUrl: RFB_DAV_FILES_URL, month };
    }
  } catch {
    /* fall through to HTTP indexes */
  }

  for (const baseUrl of RFB_INDEX_URLS) {
    try {
      const response = await fetch(baseUrl, {
        headers: { 'User-Agent': RFB_USER_AGENT },
      });
      const html = await response.text();
      const months = Array.from(
        html.matchAll(/href=["'](\d{4}-\d{2})\/?["']/gi),
        (match) => match[1],
      ).sort();
      if (!response.ok) continue;
      const month = configured && months.includes(configured)
        ? configured
        : months.at(-1);
      if (month) {
        return { baseUrl, month };
      }
    } catch {
      continue;
    }
  }

  if (configured) {
    return { baseUrl: RFB_DAV_FILES_URL, month: configured };
  }

  throw new Error(
    'Could not list Receita CNPJ folders. Set RECEITA_MONTH=YYYY-MM.',
  );
}

function rfbAuthHeaders(extra?: Record<string, string>) {
  return {
    Authorization: `Basic ${Buffer.from(`${RFB_SHARE_TOKEN}:`).toString('base64')}`,
    'User-Agent': RFB_USER_AGENT,
    ...extra,
  };
}

async function listMonthsViaWebdav(): Promise<string[]> {
  const response = await fetch(`${RFB_WEBDAV_URL}/`, {
    method: 'PROPFIND',
    headers: rfbAuthHeaders({ Depth: '1' }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`WebDAV PROPFIND failed (${response.status})`);
  }

  const months = Array.from(
    body.matchAll(/>([^<]*\d{4}-\d{2})\/?</g),
    (match) => {
      const found = match[1].match(/(\d{4}-\d{2})$/);
      return found?.[1] ?? '';
    },
  ).filter(Boolean);
  const unique = Array.from(new Set(months)).sort();
  if (unique.length === 0) {
    throw new Error('WebDAV listing had no YYYY-MM folders');
  }
  return unique;
}

async function downloadLookups(
  baseUrl: string,
  month: string,
  dataDir: string,
) {
  await downloadFileIfMissing(
    `${baseUrl}${month}/Cnaes.zip`,
    join(dataDir, 'Cnaes.zip'),
  );
  await downloadFileIfMissing(
    `${baseUrl}${month}/Municipios.zip`,
    join(dataDir, 'Municipios.zip'),
  );
}

async function downloadParts(
  baseUrl: string,
  month: string,
  dataDir: string,
  prefix: string,
  count: number,
) {
  for (let i = 0; i < count; i += 1) {
    await downloadFileIfMissing(
      `${baseUrl}${month}/${prefix}${i}.zip`,
      join(dataDir, `${prefix}${i}.zip`),
    );
  }
}

async function downloadFileIfMissing(url: string, dest: string) {
  const { access } = await import('node:fs/promises');
  try {
    await access(dest);
    console.log(`Reusing ${dest}`);
    return;
  } catch {
    /* download */
  }

  console.log(`Downloading ${url}`);
  const response = await fetch(url, { headers: rfbAuthHeaders() });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }

  const file = createWriteStream(dest);
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(response.body as never)
      .pipe(file)
      .on('finish', () => resolve())
      .on('error', reject);
  });
}

async function loadCodeTable(zipPath: string, _dataDir: string) {
  const table = new Map<string, string>();
  await forEachReceitaLine(zipPath, (cols) => {
    const code = cols[0]?.trim();
    const description = cols[1]?.trim();
    if (code && description) {
      table.set(code, description);
    }
  });
  return table;
}

function collectGarbage() {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (typeof gc === 'function') {
    gc();
  }
}

async function forEachReceitaLine(
  zipPath: string,
  onRow: (cols: string[]) => void | Promise<void>,
  options?: {
    firstFieldFilter?: Set<string>;
    shouldStop?: () => boolean;
  },
) {
  const { access } = await import('node:fs/promises');
  try {
    await access(zipPath);
  } catch {
    console.warn(`Missing ${zipPath}, skipping.`);
    return;
  }

  const proc = spawn('unzip', ['-p', zipPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve) => {
      proc.once('close', (code, signal) => resolve({ code, signal }));
    },
  );
  let stderr = '';
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const failed = new Promise<never>((_, reject) => {
    proc.on('error', (error) => {
      reject(
        new Error(
          `Failed to run unzip on ${zipPath}. Install unzip. ${String(error)}`,
        ),
      );
    });
  });

  let aborted = false;
  const readLines = (async () => {
    let leftover = Buffer.alloc(0);
    let n = 0;
    for await (const chunk of proc.stdout) {
      const data =
        leftover.length === 0
          ? chunk
          : Buffer.concat([leftover, chunk]);
      leftover = Buffer.alloc(0);
      let start = 0;
      while (start < data.length) {
        if (options?.shouldStop?.()) {
          aborted = true;
          proc.kill('SIGKILL');
          return;
        }
        const nl = data.indexOf(0x0a, start);
        if (nl < 0) {
          leftover = Buffer.from(data.subarray(start));
          break;
        }
        let end = nl;
        if (end > start && data[end - 1] === 0x0d) {
          end -= 1;
        }
        if (end > start) {
          const line = data.toString('latin1', start, end);
          const first = firstField(line);
          if (!options?.firstFieldFilter || options.firstFieldFilter.has(first)) {
            await onRow(splitReceitaLine(line));
          }
        }
        start = nl + 1;
        n += 1;
        if (n % 50_000 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      }
    }
  })();

  try {
    await Promise.race([readLines, failed]);
  } catch (error) {
    aborted = true;
    proc.kill('SIGKILL');
    throw error;
  }

  const { code, signal } = await closed;
  if (aborted || signal === 'SIGKILL' || signal === 'SIGTERM') {
    return;
  }
  if (code) {
    throw new Error(
      `unzip exited ${code} for ${zipPath}: ${stderr.slice(0, 300)}`,
    );
  }
}

function firstField(line: string): string {
  let start = 0;
  let end = line.indexOf(';');
  if (end < 0) {
    end = line.length;
  }
  if (line.charCodeAt(start) === 34) {
    start += 1;
    if (end > start && line.charCodeAt(end - 1) === 34) {
      end -= 1;
    }
  }
  return line.slice(start, end).trim();
}

function splitReceitaLine(line: string): string[] {
  const parts = line.split(';');
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (
      part.length >= 2 &&
      part.charCodeAt(0) === 34 &&
      part.charCodeAt(part.length - 1) === 34
    ) {
      parts[i] = part.slice(1, -1);
    }
  }
  return parts;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
