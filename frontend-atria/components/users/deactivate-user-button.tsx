"use client";

import { useState } from "react";
import { Loader2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useConfirm } from "@/contexts/confirm-context";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";
import { usersService } from "@/services";
import type { ManagedUser } from "@/services/types";

interface DeactivateUserButtonProps {
  user: Pick<ManagedUser, "id" | "name" | "email">;
  onSuccess?: () => void;
}

export function DeactivateUserButton({
  user,
  onSuccess,
}: DeactivateUserButtonProps) {
  const confirm = useConfirm();
  const { user: authUser } = useAuth();
  const { canDeactivateUsers } = usePermissions();
  const [submitting, setSubmitting] = useState(false);

  if (!canDeactivateUsers() || authUser?.id === user.id) {
    return null;
  }

  async function handleDeactivate() {
    const confirmed = await confirm({
      title: "Revogar acesso",
      description: `Isso impede que ${user.name} faça login no sistema. Tarefas, leads e histórico atribuídos a esta pessoa permanecem intactos. Deseja continuar?`,
      destructive: true,
      confirmLabel: "Revogar acesso",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await usersService.deactivateUser(user.id);
      toast.success("Acesso revogado com sucesso.");
      onSuccess?.();
    } catch {
      toast.error("Não foi possível revogar o acesso.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => void handleDeactivate()}
      disabled={submitting}
      title="Revogar acesso"
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      {submitting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <UserX className="size-4" />
      )}
    </Button>
  );
}
