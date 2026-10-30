"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead } from "@/services/types";

const STORAGE_KEY = "atria-maps-search-history";

export interface MapsSearchRecord {
  id: string;
  category: string;
  city: string;
  neighborhood: string;
  uf: string;
  createdAt: string;
  leadIds: string[];
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readHistory(): MapsSearchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MapsSearchRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(records: MapsSearchRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore quota / private mode
  }
}

function seedMapsSearches(leads: Lead[]): MapsSearchRecord[] {
  const groups = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = [
      normalizeText(lead.category ?? ""),
      normalizeText(lead.city ?? ""),
      normalizeText(lead.neighborhood ?? ""),
    ].join("|");
    const current = groups.get(key) ?? [];
    current.push(lead);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const sample = group[0];
    const createdAt = group.reduce(
      (latest, lead) => (lead.createdAt > latest ? lead.createdAt : latest),
      group[0]?.createdAt ?? new Date().toISOString(),
    );
    return {
      id: `legacy:${key}`,
      category: sample?.category?.trim() || "Google Maps",
      city: sample?.city?.trim() || "",
      neighborhood: sample?.neighborhood?.trim() || "",
      uf: "",
      createdAt,
      leadIds: group.map((lead) => lead.id),
    };
  });
}

export function useMapsSearchHistory(savedLeads: Lead[]) {
  const [stored, setStored] = useState<MapsSearchRecord[]>(() => readHistory());
  const claimedIds = useRef(
    new Set(readHistory().flatMap((record) => record.leadIds)),
  );

  const records = useMemo(() => {
    const claimed = new Set(claimedIds.current);
    for (const record of stored) {
      for (const leadId of record.leadIds) claimed.add(leadId);
    }
    const unclaimed = savedLeads.filter((lead) => !claimed.has(lead.id));
    const knownIds = new Set(stored.map((record) => record.id));
    const seeded = seedMapsSearches(unclaimed).filter(
      (record) => !knownIds.has(record.id) && record.leadIds.length > 0,
    );
    return [...stored, ...seeded];
  }, [savedLeads, stored]);

  useEffect(() => {
    if (savedLeads.length === 0) return;
    setStored((current) => {
      const knownIds = new Set(current.map((record) => record.id));
      const unclaimed = savedLeads.filter(
        (lead) => !claimedIds.current.has(lead.id),
      );
      const seeded = seedMapsSearches(unclaimed).filter(
        (record) => !knownIds.has(record.id) && record.leadIds.length > 0,
      );
      if (seeded.length === 0) return current;
      for (const record of seeded) {
        for (const leadId of record.leadIds) {
          claimedIds.current.add(leadId);
        }
      }
      const next = [...current, ...seeded];
      writeHistory(next);
      return next;
    });
  }, [savedLeads]);

  function rememberSearch(record: MapsSearchRecord) {
    for (const leadId of record.leadIds) {
      claimedIds.current.add(leadId);
    }
    setStored((current) => {
      const next = [record, ...current.filter((item) => item.id !== record.id)];
      writeHistory(next);
      return next;
    });
  }

  return { records, rememberSearch };
}

export function leadsForMapsSearch(
  record: MapsSearchRecord | undefined,
  savedLeads: Lead[],
): Lead[] {
  if (!record) return [];
  const byId = new Map(savedLeads.map((lead) => [lead.id, lead]));
  return record.leadIds
    .map((id) => byId.get(id))
    .filter((lead): lead is Lead => Boolean(lead));
}
