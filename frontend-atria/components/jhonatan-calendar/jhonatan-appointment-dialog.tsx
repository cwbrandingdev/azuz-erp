"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteJhonatanAppointment } from "@/services/jhonatan-calendar.service";
import type { JhonatanAppointment } from "@/services/jhonatan-calendar.service";
import { toast } from "@/lib/toast";
import { formatSaoPauloDateTime, formatSaoPauloTime } from "./calendar-time";

interface JhonatanAppointmentDialogProps {
  appointment: JhonatanAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export function JhonatanAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onCancelled,
}: JhonatanAppointmentDialogProps) {
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!appointment) return;
    setCancelling(true);
    try {
      await deleteJhonatanAppointment(appointment.id);
      toast.success("Reunião cancelada.");
      onCancelled();
      onOpenChange(false);
    } catch {
      // apiRequest already shows the error toast.
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-[var(--atria-primary)]">
            {appointment?.title ?? "Reunião"}
          </DialogTitle>
        </DialogHeader>
        {appointment ? (
          <div className="space-y-2 text-sm text-[var(--atria-primary)]">
            <p>{appointment.contactName}</p>
            {appointment.leadName ? (
              <p className="text-[var(--atria-primary)]/65">
                Lead: {appointment.leadName}
              </p>
            ) : null}
            <p className="text-[var(--atria-primary)]/65">
              {formatSaoPauloDateTime(appointment.startAt)} –{" "}
              {formatSaoPauloTime(appointment.endAt)}
            </p>
            {appointment.briefing ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--atria-primary)]/55">
                  Briefing da empresa
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {appointment.briefing}
                </p>
              </div>
            ) : null}
            <p className="text-xs text-[var(--atria-primary)]/55">
              Marcada por {appointment.createdByName}
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleCancel()}
            disabled={cancelling || !appointment}
          >
            {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Cancelar reunião
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
