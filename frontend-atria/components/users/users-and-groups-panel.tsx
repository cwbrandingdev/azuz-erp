"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddGroupMembersDialog } from "@/components/users/add-group-members-dialog";
import { CreateUserGroupDialog } from "@/components/users/create-user-group-dialog";
import { EditUserButton } from "@/components/users/edit-user-dialog";
import { ProvisionUserDialog } from "@/components/users/provision-user-dialog";
import { GroupBadge } from "@/components/ui/group-badge";
import { UserAvatar } from "@/components/users/user-avatar";
import {
  UsersDirectoryTabs,
  type UsersDirectoryTab,
} from "@/components/users/users-directory-tabs";
import { useConfirm } from "@/contexts/confirm-context";
import { ApiError, userGroupsService, usersService } from "@/services";
import type { ManagedUser, UserGroup } from "@/services/types";
import { ROLE_LABELS } from "@/lib/permissions";

export function UsersAndGroupsPanel() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<UsersDirectoryTab>("members");
  const [members, setMembers] = useState<ManagedUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      setMembers(await usersService.getMembers());
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      setGroups(await userGroupsService.getUserGroups());
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const [groupError, setGroupError] = useState<string | null>(null);

  useEffect(() => {
    void loadMembers();
    void loadGroups();
  }, [loadMembers, loadGroups]);

  async function handleDeleteGroup(id: string) {
    const confirmed = await confirm({
      description:
        "Excluir este grupo? Os membros permanecerão no sistema, mas sairão deste grupo.",
      destructive: true,
      confirmLabel: "Excluir grupo",
    });
    if (!confirmed) return;
    setGroupError(null);
    try {
      await userGroupsService.deleteUserGroup(id);
      await Promise.all([loadGroups(), loadMembers()]);
    } catch (err) {
      setGroupError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o grupo.",
      );
    }
  }

  function handleRefreshAll() {
    void loadMembers();
    void loadGroups();
  }

  return (
    <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
      <div className="flex flex-col gap-4 border-b border-[var(--atria-primary)]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <UsersDirectoryTabs
          activeTab={tab}
          onChange={setTab}
          counts={{
            members: membersLoading ? null : members.length,
            groups: groupsLoading ? null : groups.length,
          }}
        />

        <div className="flex flex-wrap gap-2">
          {tab === "members" && (
            <ProvisionUserDialog mode="member" onSuccess={handleRefreshAll} />
          )}
          {tab === "groups" && (
            <CreateUserGroupDialog onSuccess={handleRefreshAll} />
          )}
        </div>
      </div>

      {tab === "members" && (
        <MembersTable
          users={members}
          loading={membersLoading}
          onRefresh={handleRefreshAll}
        />
      )}

      {tab === "groups" && (
        <GroupsGrid
          groups={groups}
          members={members}
          loading={groupsLoading}
          error={groupError}
          onDelete={(id) => void handleDeleteGroup(id)}
          onRefresh={handleRefreshAll}
        />
      )}
    </div>
  );
}

function MembersTable({
  users,
  loading,
  onRefresh,
}: {
  users: ManagedUser[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) return <LoadingState />;
  if (users.length === 0) {
    return <EmptyState message="Nenhum membro interno cadastrado." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/3 text-xs uppercase tracking-wide text-[var(--atria-primary)]/55">
            <th className="px-4 py-3 font-medium">Membro</th>
            <th className="px-4 py-3 font-medium">Função</th>
            <th className="px-4 py-3 font-medium">Grupos</th>
            <th className="px-4 py-3 font-medium">Tarefas ativas</th>
            <th className="px-4 py-3 font-medium">Senha</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-[var(--atria-primary)]/5 hover:bg-[var(--atria-primary)]/2"
            >
              <td className="px-4 py-3">
                <UserIdentity user={user} />
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-[var(--atria-primary)]/8 px-2.5 py-0.5 text-xs font-medium text-[var(--atria-primary)]">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <GroupList user={user} />
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-[var(--atria-primary)]/75">
                  <ListTodo className="size-3.5" />
                  {user.activeTaskCount ?? 0}
                </span>
              </td>
              <td className="px-4 py-3">
                <PasswordStatus user={user} />
              </td>
              <td className="px-4 py-3 text-right">
                <EditUserButton user={user} onSuccess={onRefresh} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupsGrid({
  groups,
  members,
  loading,
  error,
  onDelete,
  onRefresh,
}: {
  groups: UserGroup[];
  members: ManagedUser[];
  loading: boolean;
  error: string | null;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  if (loading) return <LoadingState />;

  return (
    <div className="p-4">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {groups.length === 0 ? (
        <EmptyState message="Nenhum grupo criado." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const groupMembers = group.members ?? [];
            const preview = groupMembers.slice(0, 5);
            const overflow = Math.max(groupMembers.length - preview.length, 0);
            const roleSummary = summarizeRoles(groupMembers);

            return (
              <div
                key={group.id}
                className="flex flex-col rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.015] p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <h3 className="truncate font-semibold text-[var(--atria-primary)]">
                        {group.name}
                      </h3>
                    </div>
                    <p className="line-clamp-2 text-sm text-[var(--atria-primary)]/55">
                      {group.description || "Sem descrição"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(group.id)}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </Button>
                </div>

                <div className="mb-4 flex -space-x-2">
                  {preview.length === 0 ? (
                    <span className="text-xs text-[var(--atria-primary)]/40">
                      Sem membros
                    </span>
                  ) : (
                    <>
                      {preview.map((member) => (
                        <UserAvatar
                          key={member.id}
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          className="size-9 border-2 border-white"
                          fallbackClassName="bg-[var(--atria-accent)]/50 text-[10px] font-bold text-[var(--atria-primary)]"
                        />
                      ))}
                      {overflow > 0 && (
                        <span className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-[var(--atria-primary)]/10 text-[11px] font-semibold text-[var(--atria-primary)]">
                          +{overflow}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {roleSummary.length === 0 ? (
                    <span className="text-xs text-[var(--atria-primary)]/40">
                      Nenhuma função atribuída
                    </span>
                  ) : (
                    roleSummary.map((item) => (
                      <span
                        key={item.role}
                        className="rounded-full bg-[var(--atria-primary)]/8 px-2.5 py-0.5 text-[11px] font-medium text-[var(--atria-primary)]"
                      >
                        {item.label} · {item.count}
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--atria-primary)]/8 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--atria-primary)]/60">
                    <Users className="size-3.5" />
                    {group.userCount}{" "}
                    {group.userCount === 1 ? "membro" : "membros"}
                  </span>
                  <AddGroupMembersDialog
                    groupId={group.id}
                    groupName={group.name}
                    users={members.filter(
                      (member) =>
                        !groupMembers.some((current) => current.id === member.id),
                    )}
                    onSuccess={onRefresh}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserIdentity({ user }: { user: ManagedUser }) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar
        name={user.name}
        avatarUrl={user.avatarUrl}
        className="size-9 border border-[var(--atria-primary)]/10"
        fallbackClassName="bg-[var(--atria-accent)]/40 text-[10px] font-bold text-[var(--atria-primary)]"
      />
      <div>
        <p className="font-medium text-[var(--atria-primary)]">{user.name}</p>
        <p className="text-xs text-[var(--atria-primary)]/50">{user.email}</p>
      </div>
    </div>
  );
}

function GroupList({ user }: { user: ManagedUser }) {
  const groups =
    user.userGroups?.length > 0
      ? user.userGroups
      : user.userGroup
        ? [user.userGroup]
        : [];

  if (groups.length === 0) {
    return (
      <span className="text-xs text-[var(--atria-primary)]/40">Sem grupo</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((group) => (
        <GroupBadge key={group.id} name={group.name} color={group.color} />
      ))}
    </div>
  );
}

function PasswordStatus({ user }: { user: ManagedUser }) {
  const isFirstLogin = user.isFirstLogin ?? user.mustChangePassword;
  const hasChangedPassword =
    user.hasChangedPassword ?? !user.mustChangePassword;

  if (hasChangedPassword) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="size-3.5" />
        Senha definida
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <AlertCircle className="size-3.5" />
        {isFirstLogin ? "Primeiro acesso" : "Senha pendente"}
      </span>
      {user.temporaryPassword && (
        <p className="font-mono text-[11px] text-[var(--atria-primary)]/70">
          {user.temporaryPassword}
        </p>
      )}
    </div>
  );
}

function summarizeRoles(
  members: NonNullable<UserGroup["members"]>,
): Array<{ role: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const member of members) {
    counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([role, count]) => ({
      role,
      label: ROLE_LABELS[role] ?? role,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

function LoadingState() {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-8">
      <div className="size-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center text-sm text-[var(--atria-primary)]/50">
      {message}
    </div>
  );
}
