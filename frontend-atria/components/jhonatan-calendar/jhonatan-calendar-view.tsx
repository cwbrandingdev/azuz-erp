"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CALENDAR_MONTH_LABELS,
  CALENDAR_WEEKDAY_SHORT,
  getWeekDays,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import {
  listJhonatanAppointments,
  type JhonatanAppointment,
} from "@/services/jhonatan-calendar.service";
import { JhonatanAppointmentDialog } from "./jhonatan-appointment-dialog";
import { JhonatanBookingDialog } from "./jhonatan-booking-dialog";
import {
  GRID_HOURS,
  HOUR_PX,
  addDays,
  addMonths,
  formatSaoPauloTime,
  gridPlacement,
  localYmd,
  monthGrid,
  saoPauloToday,
  slotDateTimeLocal,
  weekQueryRange,
} from "./calendar-time";

type CalendarMode = "week" | "month";

const VIEW_OPTIONS: { id: CalendarMode; label: string }[] = [
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
];

export function JhonatanCalendarView() {
  const [anchor, setAnchor] = useState(() => saoPauloToday());
  const [view, setView] = useState<CalendarMode>("week");
  const [appointments, setAppointments] = useState<JhonatanAppointment[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStart, setBookingStart] = useState("");
  const [selected, setSelected] = useState<JhonatanAppointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);
  const monthDays = useMemo(() => monthGrid(anchor), [anchor]);
  const visibleDays = view === "month" ? monthDays : weekDays;
  const range = useMemo(() => weekQueryRange(visibleDays), [visibleDays]);
  const todayKey = localYmd(saoPauloToday());
  const requestKey = `${range.from}|${range.to}|${reloadKey}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    listJhonatanAppointments(range.from, range.to)
      .then((items) => {
        if (!cancelled) setAppointments(items);
      })
      .catch(() => {
        if (!cancelled) setAppointments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, reloadKey, requestKey]);

  function openBooking(day: Date, hour: number) {
    setBookingStart(slotDateTimeLocal(day, hour));
    setBookingOpen(true);
  }

  function openNewMeeting() {
    openBooking(saoPauloToday(), 10);
  }

  function openAppointment(appointment: JhonatanAppointment) {
    setSelected(appointment);
    setDetailOpen(true);
  }

  const periodLabel =
    view === "month"
      ? `${CALENDAR_MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : `${weekDays[0].toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "short",
        })} – ${weekDays[6].toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--atria-primary)] sm:text-2xl">
            Agenda do Jhonatan
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--atria-primary)]/50">
            Veja os horários livres e marque uma reunião de 1 hora.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={openNewMeeting}>
            <Plus />
            Nova reunião
          </Button>
          <div className="flex rounded-lg border border-[#004949]/15 bg-white p-0.5">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === option.id
                    ? "bg-[var(--atria-primary)] text-white"
                    : "text-[var(--atria-primary)]/65 hover:text-[var(--atria-primary)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={view === "month" ? "Mês anterior" : "Semana anterior"}
            onClick={() =>
              setAnchor((current) =>
                view === "month" ? addMonths(current, -1) : addDays(current, -7),
              )
            }
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-40 text-center text-sm font-medium text-[var(--atria-primary)]">
            {periodLabel}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={view === "month" ? "Próximo mês" : "Próxima semana"}
            onClick={() =>
              setAnchor((current) =>
                view === "month" ? addMonths(current, 1) : addDays(current, 7),
              )
            }
          >
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAnchor(saoPauloToday())}
          >
            Hoje
          </Button>
        </div>
      </div>

      <div className="max-h-[calc(100dvh-11rem)] min-h-[28rem] overflow-auto rounded-2xl border border-[#004949]/15 bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
          </div>
        ) : view === "month" ? (
          <MonthGrid
            days={monthDays}
            month={anchor.getMonth()}
            todayKey={todayKey}
            appointments={appointments}
            onBook={openBooking}
            onOpen={openAppointment}
          />
        ) : (
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-[#004949]/10">
              <div />
              {weekDays.map((day) => {
                const key = localYmd(day);
                const outside = appointments.filter(
                  (appointment) =>
                    gridPlacement(appointment.startAt, appointment.endAt, day) ===
                    "outside",
                );
                return (
                  <div
                    key={key}
                    className={cn(
                      "border-l border-[#004949]/10 px-2 py-2",
                      key === todayKey && "bg-[#004949]/5",
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#004949]/55">
                      {CALENDAR_WEEKDAY_SHORT[day.getDay()]}
                    </p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        key === todayKey
                          ? "text-[#004949]"
                          : "text-[var(--atria-primary)]",
                      )}
                    >
                      {day.getDate()}
                    </p>
                    {outside.map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => openAppointment(appointment)}
                        className="mt-1 w-full truncate rounded-md bg-[#004949] px-1.5 py-1 text-left text-[11px] font-medium text-white"
                      >
                        {formatSaoPauloTime(appointment.startAt)}{" "}
                        {appointment.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
              <div className="relative" style={{ height: GRID_HOURS.length * HOUR_PX }}>
                {GRID_HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-2 text-[11px] leading-none text-[#004949]/45"
                    style={{ top: (hour - GRID_HOURS[0]) * HOUR_PX + 6 }}
                  >
                    {padHour(hour)}
                  </div>
                ))}
              </div>

              {weekDays.map((day) => {
                const key = localYmd(day);
                const placed = appointments.flatMap((appointment) => {
                  const placement = gridPlacement(
                    appointment.startAt,
                    appointment.endAt,
                    day,
                  );
                  if (!placement || placement === "outside") return [];
                  return [{ appointment, placement }];
                });

                return (
                  <div
                    key={key}
                    className={cn(
                      "relative border-l border-[#004949]/10",
                      key === todayKey && "bg-[#004949]/[0.03]",
                    )}
                    style={{ height: GRID_HOURS.length * HOUR_PX }}
                  >
                    {GRID_HOURS.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        aria-label={`Marcar ${day.toLocaleDateString("pt-BR")} às ${padHour(hour)}`}
                        className="absolute inset-x-0 border-t border-[#004949]/10 hover:bg-[#004949]/5"
                        style={{
                          top: (hour - GRID_HOURS[0]) * HOUR_PX,
                          height: HOUR_PX,
                        }}
                        onClick={() => openBooking(day, hour)}
                      />
                    ))}
                    {placed.map(({ appointment, placement }) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => openAppointment(appointment)}
                        className="absolute inset-x-1 z-10 overflow-hidden rounded-md bg-[#004949] px-1.5 py-1 text-left text-white shadow-sm"
                        style={{ top: placement.top, height: placement.height }}
                      >
                        <span className="block truncate text-[11px] font-semibold">
                          {formatSaoPauloTime(appointment.startAt)}{" "}
                          {appointment.title}
                        </span>
                        <span className="block truncate text-[10px] text-white/80">
                          {appointment.contactName}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <JhonatanBookingDialog
        open={bookingOpen}
        initialStart={bookingStart}
        onOpenChange={setBookingOpen}
        onCreated={() => setReloadKey((current) => current + 1)}
      />
      <JhonatanAppointmentDialog
        appointment={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCancelled={() => setReloadKey((current) => current + 1)}
      />
    </div>
  );
}

function padHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

const MONDAY_FIRST_WEEKDAYS = [
  ...CALENDAR_WEEKDAY_SHORT.slice(1),
  CALENDAR_WEEKDAY_SHORT[0],
];

function MonthGrid({
  days,
  month,
  todayKey,
  appointments,
  onBook,
  onOpen,
}: {
  days: Date[];
  month: number;
  todayKey: string;
  appointments: JhonatanAppointment[];
  onBook: (day: Date, hour: number) => void;
  onOpen: (appointment: JhonatanAppointment) => void;
}) {
  return (
    <div className="min-w-[720px]">
      <div className="grid grid-cols-7 border-b border-[#004949]/10">
        {MONDAY_FIRST_WEEKDAYS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#004949]/55"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = localYmd(day);
          const inMonth = day.getMonth() === month;
          const dayAppointments = appointments.filter(
            (appointment) =>
              gridPlacement(appointment.startAt, appointment.endAt, day) !==
              null,
          );

          return (
            <div
              key={key}
              className={cn(
                "relative min-h-28 border-t border-l border-[#004949]/10",
                key === todayKey && "bg-[#004949]/5",
                !inMonth && "bg-[#004949]/[0.02]",
              )}
            >
              <button
                type="button"
                aria-label={`Marcar ${day.toLocaleDateString("pt-BR")} às 10:00`}
                className="absolute inset-0 hover:bg-[#004949]/5"
                onClick={() => onBook(day, 10)}
              />
              <div className="pointer-events-none relative z-10 flex flex-col gap-1 p-1.5">
                <span
                  className={cn(
                    "px-1 text-sm font-semibold",
                    key === todayKey
                      ? "text-[#004949]"
                      : inMonth
                        ? "text-[var(--atria-primary)]"
                        : "text-[var(--atria-primary)]/35",
                  )}
                >
                  {day.getDate()}
                </span>
                {dayAppointments.map((appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onOpen(appointment)}
                    className="pointer-events-auto truncate rounded-md bg-[#004949] px-1.5 py-1 text-left text-[11px] font-medium text-white"
                  >
                    {formatSaoPauloTime(appointment.startAt)} {appointment.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
