"use client";

import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usePortalAuth } from "@/contexts/portal-auth-context";
import { ApiError } from "@/services";

export default function PortalLoginPage() {
  const { login } = usePortalAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password, remember);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível entrar no portal.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--atria-base,#F8F8F6)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Shield className="size-10 text-[var(--atria-primary)]" />
          <h1 className="text-xl font-bold text-[var(--atria-primary)]">
            Portal do Cliente
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/60">
            Entre com o e-mail e senha fornecidos pela sua agência.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <Field>
              <FieldLabel htmlFor="portal-email">E-mail</FieldLabel>
              <Input
                id="portal-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="portal-password">Senha</FieldLabel>
              <Input
                id="portal-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[var(--atria-primary)]/70">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Manter conectado
            </label>
          </FieldGroup>

          <Button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-[var(--atria-primary)] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar no Portal"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
