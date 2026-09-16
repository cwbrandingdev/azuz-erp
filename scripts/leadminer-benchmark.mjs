#!/usr/bin/env node

const LEADMINER_API = "https://lead-miner.fly.dev";
const BACKEND_API = process.env.BACKEND_API ?? "http://localhost:3001";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

const SEARCHES = [
  {
    label: "restaurante / Curitiba / Centro",
    payload: {
      category: "restaurante",
      city: "Curitiba",
      neighborhood: "Centro",
      max_results: 25,
    },
    backendSearch: {
      queryType: "NICHO",
      queryValue: "restaurante",
      city: "Curitiba",
      uf: "PR",
      address: "Centro",
      maxResults: 25,
    },
  },
  {
    label: "pet shop / São Paulo / Pinheiros",
    payload: {
      category: "pet shop",
      city: "São Paulo",
      neighborhood: "Pinheiros",
      max_results: 25,
    },
    backendSearch: {
      queryType: "NICHO",
      queryValue: "pet shop",
      city: "São Paulo",
      uf: "SP",
      address: "Pinheiros",
      maxResults: 25,
    },
  },
  {
    label: "dentista / Rio de Janeiro / Copacabana",
    payload: {
      category: "dentista",
      city: "Rio de Janeiro",
      neighborhood: "Copacabana",
      max_results: 25,
    },
    backendSearch: {
      queryType: "NICHO",
      queryValue: "dentista",
      city: "Rio de Janeiro",
      uf: "RJ",
      address: "Copacabana",
      maxResults: 25,
    },
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeLeads(leads) {
  return {
    count: leads.length,
    withPhone: leads.filter((l) => l.phone?.trim()).length,
    withAddress: leads.filter((l) => l.address?.trim()).length,
    withWebsite: leads.filter((l) => l.website?.trim()).length,
    withRating: leads.filter((l) => l.rating != null).length,
    sampleTitles: leads.slice(0, 3).map((l) => l.title ?? l.name ?? "—"),
  };
}

async function pollLeadMinerJob(jobId) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = await fetch(
      `${LEADMINER_API}/leads/job/${encodeURIComponent(jobId)}`,
    );
    const job = await response.json();

    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Lead Miner poll timeout");
}

async function runFrontendDirect(payload) {
  const started = performance.now();

  const startResponse = await fetch(`${LEADMINER_API}/leads/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!startResponse.ok) {
    throw new Error(`Lead Miner start failed: ${startResponse.status}`);
  }

  const { job_id } = await startResponse.json();
  const job = await pollLeadMinerJob(job_id);
  const elapsedMs = Math.round(performance.now() - started);

  if (job.status === "failed") {
    throw new Error(job.error ?? "Lead Miner job failed");
  }

  return {
    elapsedMs,
    leads: job.data ?? [],
  };
}

async function loginBackend() {
  const email = process.env.BENCH_EMAIL?.trim();
  const password = process.env.BENCH_PASSWORD;

  if (!email || !password) {
    return null;
  }

  const response = await fetch(`${BACKEND_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backend login failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.accessToken ?? data.access_token ?? null;
}

async function runBackendCompanySearch(body, token) {
  const started = performance.now();

  const response = await fetch(`${BACKEND_API}/leads/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const elapsedMs = Math.round(performance.now() - started);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Backend search failed (${response.status}): ${JSON.stringify(data)}`,
    );
  }

  return {
    elapsedMs,
    leads: data.leads ?? [],
    sessionId: data.session?.id,
  };
}

async function main() {
  const frontendResults = [];
  const backendResults = [];
  const token = await loginBackend();

  console.log("Lead Miner benchmark");
  console.log(`Frontend path: direct ${LEADMINER_API}`);
  console.log(
    `Backend path: ${token ? `${BACKEND_API}/leads/search (with geocoding + persist)` : "skipped (set BENCH_EMAIL and BENCH_PASSWORD to enable)"}`,
  );
  console.log("");

  for (const search of SEARCHES) {
    console.log(`=== ${search.label} ===`);

    const frontend = await runFrontendDirect(search.payload);
    const frontendSummary = summarizeLeads(frontend.leads);
    frontendResults.push({ ...search, ...frontend, summary: frontendSummary });

    console.log(
      `Frontend direct: ${frontend.elapsedMs}ms · ${frontendSummary.count} leads`,
    );
    console.log(
      `  phone=${frontendSummary.withPhone} address=${frontendSummary.withAddress} website=${frontendSummary.withWebsite} rating=${frontendSummary.withRating}`,
    );

    if (token) {
      const backend = await runBackendCompanySearch(search.backendSearch, token);
      const backendSummary = summarizeLeads(backend.leads);
      backendResults.push({ ...search, ...backend, summary: backendSummary });

      console.log(
        `Backend /leads/search: ${backend.elapsedMs}ms · ${backendSummary.count} leads (session ${backend.sessionId})`,
      );
      console.log(
        `  phone=${backendSummary.withPhone} address=${backendSummary.withAddress} website=${backendSummary.withWebsite} rating=${backendSummary.withRating}`,
      );

      const dropped = frontendSummary.count - backendSummary.count;
      if (dropped > 0) {
        console.log(`  dropped vs API: ${dropped}`);
      }
    }

    console.log("");
  }

  const frontendAvg = Math.round(
    frontendResults.reduce((sum, item) => sum + item.elapsedMs, 0) /
      frontendResults.length,
  );
  const frontendTotalLeads = frontendResults.reduce(
    (sum, item) => sum + item.summary.count,
    0,
  );

  console.log("=== SUMMARY ===");
  console.log(
    `Frontend direct (3 runs): avg ${frontendAvg}ms · total ${frontendTotalLeads} leads`,
  );

  if (backendResults.length > 0) {
    const backendAvg = Math.round(
      backendResults.reduce((sum, item) => sum + item.elapsedMs, 0) /
        backendResults.length,
    );
    const backendTotalLeads = backendResults.reduce(
      (sum, item) => sum + item.summary.count,
      0,
    );

    console.log(
      `Backend /leads/search (3 runs): avg ${backendAvg}ms · total ${backendTotalLeads} leads`,
    );
  }

  console.log(JSON.stringify({ frontendResults, backendResults }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
