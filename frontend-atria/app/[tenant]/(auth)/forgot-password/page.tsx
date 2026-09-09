import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#f7fafa] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-8 shadow-xl shadow-[#004949]/5">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--atria-primary)]/60 transition-colors hover:text-[var(--atria-primary)]"
        >
          <ArrowLeft className="size-4" />
          Voltar ao login
        </Link>

        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-[var(--atria-accent)]/20 text-[var(--atria-primary)]">
          <Mail className="size-5" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm text-[var(--atria-primary)]/55">
          Esta funcionalidade estará disponível em breve. Entre em contato com o
          administrador da sua conta para redefinir o acesso.
        </p>
      </div>
    </div>
  );
}
