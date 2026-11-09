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
import { getSafeNextPath } from "@/lib/auth-redirect";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services";

export type LoginFormTone = "light" | "dark";

// Classes que mudam entre fundo claro e fundo escuro; a lógica do login é a mesma.
const TONES = {
  light: {
    title: "text-[var(--atria-primary)]",
    subtitle: "text-[var(--atria-primary)]/55",
    card: "border-[var(--atria-primary)]/10 bg-white/80 shadow-xl shadow-[#004949]/5",
    labelActive: "text-[var(--atria-primary)]",
    labelIdle: "text-[var(--atria-primary)]/45",
    icon: "text-[var(--atria-primary)]/40",
    input:
      "border-[var(--atria-primary)]/15 bg-white text-[var(--atria-primary)] hover:border-[var(--atria-primary)]/25 focus:border-[var(--atria-primary)] focus:ring-[var(--atria-primary)]/10",
    eye: "text-[var(--atria-primary)]/45 hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)]",
    remember: "text-[var(--atria-primary)]/70",
    checkbox:
      "border-[var(--atria-primary)]/25 text-[var(--atria-primary)] focus:ring-[var(--atria-primary)]/20",
    link: "text-[var(--atria-primary)] hover:text-[var(--atria-primary)]/80",
    button:
      "bg-gradient-to-r from-[#004949] via-[#005f5f] to-[#004949] text-white hover:shadow-[#004949]/20",
    spinnerDot: "bg-white",
    footer: "text-[var(--atria-primary)]/40",
    logoVariant: "login",
  },
  dark: {
    title: "text-white",
    subtitle: "text-white/55",
    card: "border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30",
    labelActive: "text-[#E8C39E]",
    labelIdle: "text-white/45",
    icon: "text-white/40",
    input:
      "border-white/15 bg-white/[0.04] text-white hover:border-white/25 focus:border-[#E8C39E] focus:ring-[#E8C39E]/15",
    eye: "text-white/45 hover:bg-white/10 hover:text-white",
    remember: "text-white/70",
    checkbox: "border-white/25 text-[#E8C39E] focus:ring-[#E8C39E]/20",
    link: "text-[#E8C39E] hover:text-[#E8C39E]/80",
    button:
      "bg-gradient-to-r from-[#E8C39E] via-[#f0d4b4] to-[#E8C39E] text-[#003535] hover:shadow-[#E8C39E]/20",
    spinnerDot: "bg-[#003535]",
    footer: "text-white/35",
    logoVariant: "sidebar",
  },
} as const;

type ToneClasses = (typeof TONES)[LoginFormTone];

function FloatingField({
  id,
  label,
  type,
  value,
  onChange,
  icon: Icon,
  autoComplete,
  trailing,
  tone,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  autoComplete?: string;
  trailing?: React.ReactNode;
  tone: ToneClasses;
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
            ? cn("top-2 text-[11px] font-medium", tone.labelActive)
            : cn("top-1/2 -translate-y-1/2 text-sm", tone.labelIdle),
        )}
      >
        {label}
      </label>
      <div
        className={cn(
          "pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2",
          tone.icon,
        )}
      >
        <Icon className="size-4" />
      </div>
      {trailing}
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-14 w-full rounded-xl border px-11 text-base outline-none transition-all duration-200 focus:ring-4 md:text-sm",
          tone.input,
          active ? "pt-5 pb-2" : "py-3.5",
          trailing ? "pr-12" : "pr-4",
        )}
        required
      />
    </div>
  );
}

function LoginSpinner({ dotClassName }: { dotClassName: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className={cn("login-spinner-dot size-1.5 rounded-full", dotClassName)} />
      <span className={cn("login-spinner-dot size-1.5 rounded-full", dotClassName)} />
      <span className={cn("login-spinner-dot size-1.5 rounded-full", dotClassName)} />
    </span>
  );
}

export function LoginForm({
  tone: toneName = "light",
  showHeader = true,
  centered = false,
  framed = true,
}: {
  tone?: LoginFormTone;
  showHeader?: boolean;
  centered?: boolean;
  framed?: boolean;
} = {}) {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const { company } = useCompany();
  const emailId = useId();
  const passwordId = useId();
  const companyLabel = company?.name ?? null;
  const tone = TONES[toneName];

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
      router.replace(getSafeNextPath() ?? getHomePathForRole(user?.role));
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
      router.push(getSafeNextPath() ?? getHomePathForRole(loggedUser?.role ?? user?.role));
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
      {showHeader && (
        <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-5">
            <AgencyLogo
              size="lg"
              variant={tone.logoVariant}
              subtitle="Workspace inteligente"
              showName
            />
          </div>

          <h1
            className={cn(
              "text-2xl font-bold tracking-tight sm:text-3xl",
              tone.title,
            )}
          >
            Bem-vindo de volta
          </h1>
          <p className={cn("mt-2 max-w-sm text-sm", tone.subtitle)}>
            {companyLabel
              ? `Acesse sua conta em ${companyLabel} para continuar gerenciando projetos, clientes e conteúdo.`
              : "Acesse sua conta para continuar gerenciando projetos, clientes e conteúdo."}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full",
          framed && cn("rounded-2xl border p-6 backdrop-blur-sm sm:p-8", tone.card),
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
            tone={tone}
          />

          <FloatingField
            id={passwordId}
            label="Senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            icon={Lock}
            autoComplete="current-password"
            tone={tone}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className={cn(
                  "absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-md p-1.5 transition-colors",
                  tone.eye,
                )}
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
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2.5 text-sm",
                tone.remember,
              )}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={cn("size-4 rounded", tone.checkbox)}
              />
              Lembrar de mim
            </label>
            <Link
              href="/forgot-password"
              className={cn(
                "text-sm font-medium underline-offset-4 transition-colors hover:underline",
                tone.link,
              )}
            >
              Esqueci a senha
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "group relative mt-1 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold transition-all duration-300",
              tone.button,
              "hover:shadow-lg active:scale-[0.99]",
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
                  <LoginSpinner dotClassName={tone.spinnerDot} />
                  <span className="sr-only">Entrando</span>
                </>
              ) : (
                "Entrar"
              )}
            </span>
          </button>
        </div>
      </form>

      <p
        className={cn(
          "mt-6 text-center text-xs",
          !centered && "lg:text-left",
          tone.footer,
        )}
      >
        Ao continuar, você concorda com os termos de uso da plataforma AZUZ.
      </p>
    </div>
  );
}
