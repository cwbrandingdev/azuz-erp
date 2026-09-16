"use client";

import { useState } from "react";
import { Camera, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserAvatarPicker } from "@/components/users/user-avatar-picker";
import { ROLE_LABELS } from "@/lib/permissions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { usersService } from "@/services";

interface UserAccountMenuProps {
  tone?: "light" | "dark";
}

export function UserAccountMenu({
  tone = "light",
}: UserAccountMenuProps) {
  const { user, logout, updateUser } = useAuth();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const isDark = tone === "dark";

  function openAvatarDialog() {
    setAvatarUrl(user?.avatarUrl ?? null);
    setAvatarOpen(true);
  }

  const roleLabel = user?.role
    ? (ROLE_LABELS[user.role.toLowerCase()] ?? user.role)
    : "Membro";

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 transition-colors",
                  isDark
                    ? "hover:bg-white/10"
                    : "hover:bg-[var(--atria-primary)]/5",
                )}
                aria-label="Perfil"
              />
            }
          >
            <UserAvatar
              name={user?.name ?? "Usuário"}
              avatarUrl={user?.avatarUrl}
              className="size-9 border border-white/15 ring-2 ring-[var(--atria-accent)]/40"
              fallbackClassName="bg-[var(--atria-accent)] text-xs font-bold text-[var(--atria-primary)]"
            />
            <span className="hidden min-w-0 text-left sm:block">
              <span
                className={cn(
                  "block max-w-[8.5rem] truncate text-sm font-semibold leading-tight",
                  isDark ? "text-white" : "text-[var(--atria-primary)]",
                )}
              >
                {user?.name ?? "Usuário"}
              </span>
              <span
                className={cn(
                  "block max-w-[8.5rem] truncate text-[11px] leading-tight",
                  isDark ? "text-white/45" : "text-[var(--atria-primary)]/45",
                )}
              >
                {roleLabel}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "hidden size-3.5 sm:block",
                isDark ? "text-white/40" : "text-[var(--atria-primary)]/40",
              )}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{user?.name ?? "Usuário"}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openAvatarDialog}>
              <Camera className="size-4" />
              Alterar foto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void logout()}
          className={cn(
            "gap-1.5",
            isDark
              ? "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              : "border-[var(--atria-primary)]/15 text-[var(--atria-primary)]",
          )}
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>

      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--atria-primary)]">
              Foto de perfil
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <UserAvatarPicker
              name={user?.name ?? "Usuário"}
              value={avatarUrl}
              onChange={(next) => setAvatarUrl(next)}
              onUpload={async (file) => {
                const updated = await usersService.uploadMyAvatar(file);
                updateUser({
                  avatarUrl: updated.avatarUrl ?? undefined,
                });
                toast.success("Foto atualizada!");
                return updated.avatarUrl ?? "";
              }}
              onRemove={async () => {
                await usersService.removeMyAvatar();
                updateUser({ avatarUrl: undefined });
                setAvatarUrl(null);
                toast.success("Foto removida.");
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAvatarOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
