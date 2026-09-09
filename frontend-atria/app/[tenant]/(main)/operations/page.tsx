"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/financial-utils";
import { cn } from "@/lib/utils";
import {
  agendaEventsService,
  artTypePricingService,
  calendarEntriesService,
  clientReportFilesService,
  clientRequestsService,
} from "@/services";
import type {
  AgendaEvent,
  ArtTypePricing,
  CalendarEntry,
  ClientReportFile,
  ClientRequest,
} from "@/services/types";

type OperationsTab =
  | "pricing"
  | "planning"
  | "agenda"
  | "requests"
  | "reports";

const TABS: Array<{ id: OperationsTab; label: string }> = [
  { id: "pricing", label: "Preços por tipo de arte" },
  { id: "planning", label: "Planejamento" },
  { id: "agenda", label: "Agenda legado" },
  { id: "requests", label: "Solicitações" },
  { id: "reports", label: "Arquivos de relatório" },
];

export default function OperationsPage() {
  const [tab, setTab] = useState<OperationsTab>("pricing");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Operações
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Preços, planejamento, agenda, solicitações e relatórios
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/60 p-1.5 backdrop-blur-md">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === item.id
                ? "bg-[var(--atria-primary)] text-white shadow-sm"
                : "text-[var(--atria-primary)]/70 hover:bg-white/80 hover:text-[var(--atria-primary)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "pricing" && <ArtTypePricingTab />}
      {tab === "planning" && <CalendarEntriesTab />}
      {tab === "agenda" && <AgendaEventsTab />}
      {tab === "requests" && <ClientRequestsTab />}
      {tab === "reports" && <ClientReportFilesTab />}
    </div>
  );
}

function ArtTypePricingTab() {
  const [items, setItems] = useState<ArtTypePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [artType, setArtType] = useState("");
  const [pricePerPiece, setPricePerPiece] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await artTypePricingService.getArtTypePricings());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(pricePerPiece);
    if (!artType.trim() || Number.isNaN(price)) return;
    setSubmitting(true);
    try {
      await artTypePricingService.createArtTypePricing({
        artType: artType.trim(),
        pricePerPiece: price,
        description: description.trim() || undefined,
      });
      setArtType("");
      setPricePerPiece("");
      setDescription("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Novo preço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Tipo de arte</Label>
              <Input
                value={artType}
                onChange={(e) => setArtType(e.target.value)}
                placeholder="Ex: carrossel"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">
                Preço por peça
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={pricePerPiece}
                onChange={(e) => setPricePerPiece(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Preços cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-[var(--atria-primary)]/10">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--atria-primary)]">
                      {item.artType}
                    </p>
                    {item.description ? (
                      <p className="text-sm text-[var(--atria-primary)]/50">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-semibold text-[var(--atria-primary)]">
                    {formatCurrency(Number(item.pricePerPiece))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarEntriesTab() {
  const [items, setItems] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterClientId, setFilterClientId] = useState("");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [artType, setArtType] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await calendarEntriesService.getCalendarEntries({
          clientId: filterClientId.trim() || undefined,
          month: month ? Number(month) : undefined,
          year: year ? Number(year) : undefined,
        }),
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterClientId, month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const monthNum = Number(month);
    const yearNum = Number(year);
    if (
      !clientId.trim() ||
      !title.trim() ||
      !artType.trim() ||
      !plannedDate ||
      !designerId.trim() ||
      Number.isNaN(monthNum) ||
      Number.isNaN(yearNum)
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await calendarEntriesService.createCalendarEntry({
        clientId: clientId.trim(),
        title: title.trim(),
        artType: artType.trim(),
        plannedDate,
        designerId: designerId.trim(),
        month: monthNum,
        year: yearNum,
        description: description.trim() || undefined,
      });
      setClientId("");
      setTitle("");
      setArtType("");
      setPlannedDate("");
      setDesignerId("");
      setDescription("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Nova entrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Client ID</Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Tipo de arte</Label>
              <Input
                value={artType}
                onChange={(e) => setArtType(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[var(--atria-primary)]">Mês</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--atria-primary)]">Ano</Label>
                <Input
                  type="number"
                  min="2000"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">
                Data planejada
              </Label>
              <Input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Designer ID</Label>
              <Input
                value={designerId}
                onChange={(e) => setDesignerId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader className="gap-3">
          <CardTitle className="text-[var(--atria-primary)]">
            Planejamento
          </CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">
                Filtrar clientId
              </Label>
              <Input
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                placeholder="UUID do cliente"
                className="w-56"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-[var(--atria-primary)]/10">
              {items.map((item) => (
                <li key={item.id} className="space-y-1 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-[var(--atria-primary)]">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-xs text-[var(--atria-primary)]/50">
                      {item.plannedDate}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--atria-primary)]/60">
                    {item.artType} · {item.month}/{item.year} · cliente{" "}
                    {item.clientId}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgendaEventsTab() {
  const [items, setItems] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("meeting");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await agendaEventsService.getAgendaEvents());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate || !eventType.trim()) return;
    setSubmitting(true);
    try {
      await agendaEventsService.createAgendaEvent({
        title: title.trim(),
        eventDate,
        eventType: eventType.trim(),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
      });
      setTitle("");
      setEventDate("");
      setStartTime("");
      setEndTime("");
      setDescription("");
      setLocation("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirm(id: string) {
    await agendaEventsService.confirmAgendaEvent(id);
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Novo evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Data</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Tipo</Label>
              <Input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[var(--atria-primary)]">Início</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--atria-primary)]">Fim</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Local</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Eventos da agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-[var(--atria-primary)]/10">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--atria-primary)]">
                      {item.title}
                    </p>
                    <p className="text-sm text-[var(--atria-primary)]/60">
                      {item.eventDate}
                      {item.startTime ? ` · ${item.startTime}` : ""}
                      {item.endTime ? `–${item.endTime}` : ""} · {item.eventType}{" "}
                      · {item.status}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onConfirm(item.id)}
                  >
                    Confirmar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientRequestsTab() {
  const [items, setItems] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterClientId, setFilterClientId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await clientRequestsService.getClientRequests({
          clientId: filterClientId.trim() || undefined,
          status: filterStatus.trim() || undefined,
        }),
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterClientId, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !title.trim()) return;
    setSubmitting(true);
    try {
      await clientRequestsService.createClientRequest({
        clientId: clientId.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        status: status.trim() || undefined,
      });
      setClientId("");
      setTitle("");
      setDescription("");
      setStatus("open");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Nova solicitação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Client ID</Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Status</Label>
              <Input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="open"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader className="gap-3">
          <CardTitle className="text-[var(--atria-primary)]">
            Solicitações
          </CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Client ID</Label>
              <Input
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Status</Label>
              <Input
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-32"
                placeholder="open"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-[var(--atria-primary)]/10">
              {items.map((item) => (
                <li key={item.id} className="space-y-1 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-[var(--atria-primary)]">
                      {item.title}
                    </p>
                    <span className="shrink-0 rounded-md bg-[var(--atria-primary)]/5 px-2 py-0.5 text-xs font-medium text-[var(--atria-primary)]">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--atria-primary)]/60">
                    cliente {item.clientId}
                    {item.description ? ` · ${item.description}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientReportFilesTab() {
  const [items, setItems] = useState<ClientReportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("pdf");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await clientReportFilesService.getClientReportFiles());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !title.trim() || !fileUrl.trim() || !fileType.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await clientReportFilesService.createClientReportFile({
        clientId: clientId.trim(),
        title: title.trim(),
        fileUrl: fileUrl.trim(),
        fileType: fileType.trim(),
      });
      setClientId("");
      setTitle("");
      setFileUrl("");
      setFileType("pdf");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove(id: string) {
    await clientReportFilesService.approveClientReportFile(id);
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Novo arquivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Client ID</Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">URL do arquivo</Label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--atria-primary)]">Tipo</Label>
              <Input
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-[var(--atria-primary)]/10 bg-white">
        <CardHeader>
          <CardTitle className="text-[var(--atria-primary)]">
            Arquivos de relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-[var(--atria-primary)]/10">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--atria-primary)]">
                      {item.title}
                    </p>
                    <p className="text-sm text-[var(--atria-primary)]/60">
                      {item.fileType} · {item.status} · cliente {item.clientId}
                    </p>
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--atria-primary)] underline underline-offset-2"
                    >
                      Abrir arquivo
                    </a>
                  </div>
                  {item.status !== "approved" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onApprove(item.id)}
                    >
                      Aprovar
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-32 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
    </div>
  );
}

function EmptyState() {
  return (
    <p className="py-8 text-center text-sm text-[var(--atria-primary)]/50">
      Nenhum registro encontrado
    </p>
  );
}
