"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { AgencyLogo } from "@/components/branding/agency-logo";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCompany } from "@/contexts/company-context";
import {
  getRememberedEmail,
  setRememberedEmail,
} from "@/lib/auth-storage";
import { getHomePathForRole } from "@/lib/roles";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services";

function FloatingField({
  id,
  label,
  type,
  value,
  onChange,
  icon: Icon,
  autoComplete,
  autoFocus,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  autoComplete?: string;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-11 z-10 origin-left transition-all duration-200",
          active
            ? "top-2 text-[11px] font-medium text-[var(--atria-primary)]"
            : "top-1/2 -translate-y-1/2 text-sm text-[var(--atria-primary)]/45",
        )}
      >
        {label}
      </label>
      <div className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-[var(--atria-primary)]/40">
        <Icon className="size-4" />
      </div>
      {trailing}
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-14 w-full rounded-xl border bg-white px-11 text-sm text-[var(--atria-primary)] outline-none transition-all duration-200",
          "border-[var(--atria-primary)]/15 hover:border-[var(--atria-primary)]/25",
          "focus:border-[var(--atria-primary)] focus:ring-4 focus:ring-[var(--atria-primary)]/10",
          active ? "pt-5 pb-2" : "py-3.5",
          trailing ? "pr-12" : "pr-4",
        )}
        required
      />
    </div>
  );
}

function LoginSpinner() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className="login-spinner-dot size-1.5 rounded-full bg-white" />
      <span className="login-spinner-dot size-1.5 rounded-full bg-white" />
      <span className="login-spinner-dot size-1.5 rounded-full bg-white" />
    </span>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const { company } = useCompany();
  const emailId = useId();
  const passwordId = useId();
  const companyLabel = company?.name ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rememberedEmail = getRememberedEmail();
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getHomePathForRole(user?.role));
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 600);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const loggedUser = await login({ email, password }, rememberMe);
      setRememberedEmail(rememberMe ? email : null);
      toast.success("Bem-vindo de volta!");
      router.push(getHomePathForRole(loggedUser?.role ?? user?.role));
    } catch (err) {
      triggerShake();
      if (err instanceof ApiError) {
        toast.error("E-mail ou senha inválidos");
      } else {
        toast.error("Não foi possível fazer login. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col">
      <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
        <div className="mb-5">
          <AgencyLogo
            size="lg"
            variant="login"
            subtitle="Workspace inteligente"
            showName
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[var(--atria-primary)] sm:text-3xl">
          Bem-vindo de volta
        </h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--atria-primary)]/55">
          {companyLabel
            ? `Acesse sua conta em ${companyLabel} para continuar gerenciando projetos, clientes e conteúdo.`
            : "Acesse sua conta para continuar gerenciando projetos, clientes e conteúdo."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full rounded-2xl border border-[var(--atria-primary)]/10 bg-white/80 p-6 shadow-xl shadow-[#004949]/5 backdrop-blur-sm sm:p-8",
          shake && "login-form-shake",
        )}
        noValidate
      >
        <div className="flex flex-col gap-5">
          <FloatingField
            id={emailId}
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            icon={Mail}
            autoComplete="email"
            autoFocus
          />

          <FloatingField
            id={passwordId}
            label="Senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            icon={Lock}
            autoComplete="current-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-md p-1.5 text-[var(--atria-primary)]/45 transition-colors hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)]"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--atria-primary)]/70">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-[var(--atria-primary)]/25 text-[var(--atria-primary)] focus:ring-[var(--atria-primary)]/20"
              />
              Lembrar de mim
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--atria-primary)] underline-offset-4 transition-colors hover:text-[var(--atria-primary)]/80 hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "group relative mt-1 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold text-white transition-all duration-300",
              "bg-gradient-to-r from-[#004949] via-[#005f5f] to-[#004949]",
              "hover:shadow-lg hover:shadow-[#004949]/20 active:scale-[0.99]",
              "disabled:pointer-events-none disabled:opacity-70",
            )}
          >
            <span
              className="login-shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                backgroundImage:
                  "linear-gradient(110deg, transparent 25%, rgba(232,195,158,0.25) 50%, transparent 75%)",
              }}
            />
            <span className="relative flex items-center gap-2">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <LoginSpinner />
                  <span className="sr-only">Entrando</span>
                </>
              ) : (
                "Entrar"
              )}
            </span>
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--atria-primary)]/40 lg:text-left">
        Ao continuar, você concorda com os termos de uso da plataforma ATRIA.
      </p>
    </div>
  );
}
