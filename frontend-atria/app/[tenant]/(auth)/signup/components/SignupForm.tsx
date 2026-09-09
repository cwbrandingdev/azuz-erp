"use client";

import { Suspense, useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { AgencyLogo } from "@/components/branding/agency-logo";
import { useAuth } from "@/contexts/auth-context";
import { ROLE_LABELS } from "@/lib/permissions";
import { getHomePathForRole } from "@/lib/roles";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ApiError, authService } from "@/services";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const { completeAuthSession } = useAuth();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<{
    role: string;
    companyName: string;
    expiresAt: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidationError("Link de convite inválido. Solicite um novo convite.");
      setValidating(false);
      return;
    }

    let cancelled = false;

    async function validate() {
      setValidating(true);
      setValidationError(null);
      try {
        const result = await authService.validateInvitationToken(token);
        if (!cancelled) {
          setInvitation({
            role: result.role,
            companyName: result.companyName,
            expiresAt: result.expiresAt,
          });
        }
      } catch {
        if (!cancelled) {
          setInvitation(null);
          setValidationError(
            "Convite inválido, expirado ou já utilizado. Solicite um novo convite.",
          );
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    }

    void validate();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !invitation) return;

    setSubmitting(true);
    try {
      const response = await authService.signupWithToken({
        token,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      completeAuthSession(response, true);
      toast.success("Conta criada com sucesso!");
      router.push(getHomePathForRole(response.user.role));
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Não foi possível concluir o cadastro.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabel =
    ROLE_LABELS[invitation?.role.toLowerCase() ?? ""] ?? invitation?.role;

  return (
    <div className="flex w-full flex-col">
      <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
        <div className="mb-5">
          <AgencyLogo
            size="lg"
            variant="login"
            subtitle="Convite de acesso"
            showName
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--atria-primary)] sm:text-3xl">
          Criar sua conta
        </h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--atria-primary)]/55">
          Complete o cadastro com o convite recebido para acessar a plataforma.
        </p>
      </div>

      {validating ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[var(--atria-primary)]/10 bg-white/80 p-8">
          <div className="flex items-center gap-3 text-sm text-[var(--atria-primary)]/70">
            <Loader2 className="size-5 animate-spin" />
            Validando convite...
          </div>
        </div>
      ) : validationError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {validationError}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-[var(--atria-primary)]/10 bg-white/80 p-6 shadow-xl shadow-[#004949]/5 backdrop-blur-sm sm:p-8"
        >
          <div className="mb-6 rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.03] p-4 text-sm text-[var(--atria-primary)]/75">
            <p>
              <span className="font-medium text-[var(--atria-primary)]">
                {invitation?.companyName}
              </span>
            </p>
            <p className="mt-1">
              Função:{" "}
              <span className="font-medium text-[var(--atria-primary)]">
                {roleLabel}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--atria-primary)]">
                Nome completo
              </span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
                <input
                  id={nameId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--atria-primary)]/15 bg-white pl-10 pr-4 text-sm outline-none focus:border-[var(--atria-primary)] focus:ring-4 focus:ring-[var(--atria-primary)]/10"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--atria-primary)]">
                E-mail
              </span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--atria-primary)]/15 bg-white pl-10 pr-4 text-sm outline-none focus:border-[var(--atria-primary)] focus:ring-4 focus:ring-[var(--atria-primary)]/10"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--atria-primary)]">
                Senha
              </span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  className="h-12 w-full rounded-xl border border-[var(--atria-primary)]/15 bg-white pl-10 pr-12 text-sm outline-none focus:border-[var(--atria-primary)] focus:ring-4 focus:ring-[var(--atria-primary)]/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--atria-primary)]/45 hover:bg-[var(--atria-primary)]/5"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--atria-primary)] text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-70",
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function SignupForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[280px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
