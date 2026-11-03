import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LEADS_URL = "https://www.cwbranding.com.br/api/leads";

export async function GET() {
  const apiKey = process.env.CWBRANDING_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CWBRANDING_API_KEY não configurada" },
      { status: 500 },
    );
  }

  try {
    const externalRes = await fetch(LEADS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const data = await externalRes.json();
    return NextResponse.json(data, { status: externalRes.status });
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar leads" },
      { status: 500 },
    );
  }
}
