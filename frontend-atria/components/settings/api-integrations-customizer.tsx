"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  KeyRound,
  Loader2,
  MessageCircle,
  Save,
  Webhook,
} from "lucide-react";
import { WhatsappConnectButton } from "@/components/settings/whatsapp-connect-button";
import { SecretInput } from "@/components/settings/secret-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resolveSecretUpdateValue } from "@/lib/secret-field";
import { toast } from "@/lib/toast";
import { ApiError, companySettingsService } from "@/services";
import type { CompanyIntegrations } from "@/services/types";

const DEFAULT_INTEGRATIONS: CompanyIntegrations = {
  metaAdAccountId: null,
  metaAppId: null,
  metaPageAccessToken: null,
  metaAppSecret: null,
  apifyApiToken: null,
  whatsappApiToken: null,
  whatsappPhoneNumberId: null,
  whatsappBusinessAccountId: null,
  whatsappVerifyToken: null,
  whatsappEmbeddedSignupConfigId: null,
  whatsappAppId: null,
  whatsappAppSecret: null,
  hasMetaPageAccessToken: false,
  hasMetaAppSecret: false,
  hasApifyApiToken: false,
  hasWhatsappApiToken: false,
  hasWhatsappVerifyToken: false,
  hasWhatsappAppSecret: false,
  whatsappConfigured: false,
  whatsappWebhookUrl: null,
  updatedAt: "",
};

type SecretDrafts = {
  metaPageAccessToken: string;
  metaAppSecret: string;
  apifyApiToken: string;
  whatsappAppSecret: string;
};

const EMPTY_SECRETS: SecretDrafts = {
  metaPageAccessToken: "",
  metaAppSecret: "",
  apifyApiToken: "",
  whatsappAppSecret: "",
};

export function ApiIntegrationsCustomizer() {
  const [integrations, setIntegrations] =
    useState<CompanyIntegrations>(DEFAULT_INTEGRATIONS);
  const [secretDrafts, setSecretDrafts] =
    useState<SecretDrafts>(EMPTY_SECRETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    companySettingsService
      .getCompanyIntegrations()
      .then((data) => {
        if (!active) return;
        setIntegrations(data);
        setSecretDrafts(EMPTY_SECRETS);
      })
      .catch((error) => {
        if (!active) return;
        setIntegrations(DEFAULT_INTEGRATIONS);
        setSecretDrafts(EMPTY_SECRETS);
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar as integrações.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload: Partial<CompanyIntegrations> = {
        metaAdAccountId: integrations.metaAdAccountId?.trim() || null,
        metaAppId: integrations.metaAppId?.trim() || null,
      };

      const metaPageAccessToken = resolveSecretUpdateValue(
        secretDrafts.metaPageAccessToken,
        integrations.hasMetaPageAccessToken,
      );
      const metaAppSecret = resolveSecretUpdateValue(
        secretDrafts.metaAppSecret,
        integrations.hasMetaAppSecret,
      );
      const apifyApiToken = resolveSecretUpdateValue(
        secretDrafts.apifyApiToken,
        integrations.hasApifyApiToken,
      );
      const whatsappAppSecret = resolveSecretUpdateValue(
        secretDrafts.whatsappAppSecret,
        integrations.hasWhatsappAppSecret,
      );

      if (metaPageAccessToken !== undefined) {
        payload.metaPageAccessToken = metaPageAccessToken;
      }
      if (metaAppSecret !== undefined) {
        payload.metaAppSecret = metaAppSecret;
      }
      if (apifyApiToken !== undefined) {
        payload.apifyApiToken = apifyApiToken;
      }
      if (whatsappAppSecret !== undefined) {
        payload.whatsappAppSecret = whatsappAppSecret;
      }

      payload.whatsappAppId = integrations.whatsappAppId?.trim() || null;
      payload.whatsappEmbeddedSignupConfigId =
        integrations.whatsappEmbeddedSignupConfigId?.trim() || null;

      const updated =
        await companySettingsService.updateCompanyIntegrations(payload);
      setIntegrations(updated);
      setSecretDrafts(EMPTY_SECRETS);
      toast.success("Chaves de API salvas com sucesso");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar as integrações.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--atria-primary)]">
              Meta / Facebook Ads
            </h2>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Credenciais da Meta para analytics e campanhas desta empresa
            </p>
          </div>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="meta-ad-account-id">
              Ad Account ID
            </FieldLabel>
            <Input
              id="meta-ad-account-id"
              value={integrations.metaAdAccountId ?? ""}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  metaAdAccountId: event.target.value || null,
                }))
              }
              placeholder="act_1234567890"
              autoComplete="off"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="meta-app-id">App ID (Ads)</FieldLabel>
            <Input
              id="meta-app-id"
              value={integrations.metaAppId ?? ""}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  metaAppId: event.target.value || null,
                }))
              }
              placeholder="ID do app em developers.facebook.com"
              autoComplete="off"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="meta-page-access-token">
              Page Access Token
            </FieldLabel>
            <SecretInput
              id="meta-page-access-token"
              value={secretDrafts.metaPageAccessToken}
              onChange={(event) =>
                setSecretDrafts((current) => ({
                  ...current,
                  metaPageAccessToken: event.target.value,
                }))
              }
              placeholder={
                integrations.hasMetaPageAccessToken
                  ? "Token configurado — deixe em branco para manter"
                  : "EAA..."
              }
              autoComplete="new-password"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="meta-app-secret">App Secret (Ads)</FieldLabel>
            <SecretInput
              id="meta-app-secret"
              value={secretDrafts.metaAppSecret}
              onChange={(event) =>
                setSecretDrafts((current) => ({
                  ...current,
                  metaAppSecret: event.target.value,
                }))
              }
              placeholder={
                integrations.hasMetaAppSecret
                  ? "Secret configurado — deixe em branco para manter"
                  : "App secret da Meta"
              }
              autoComplete="new-password"
            />
          </Field>
        </FieldGroup>
      </Card>

      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--atria-accent)]/25 text-[var(--atria-primary)]">
            <Webhook className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--atria-primary)]">
              Apify / Web Scraping
            </h2>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Token Apify para prospecção de leads no Google Maps
            </p>
          </div>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="apify-api-token">Apify API Token</FieldLabel>
            <SecretInput
              id="apify-api-token"
              value={secretDrafts.apifyApiToken}
              onChange={(event) =>
                setSecretDrafts((current) => ({
                  ...current,
                  apifyApiToken: event.target.value,
                }))
              }
              placeholder={
                integrations.hasApifyApiToken
                  ? "Token configurado — deixe em branco para manter"
                  : "apify_api_..."
              }
              autoComplete="new-password"
            />
            {integrations.hasApifyApiToken && (
              <p className="mt-1.5 text-xs text-[var(--atria-primary)]/45">
                Token criptografado já salvo para este tenant.
              </p>
            )}
          </Field>
        </FieldGroup>
      </Card>

      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#128C7E]">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--atria-primary)]">
              WhatsApp
            </h2>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Salve as três chaves e clique em Conectar. A Meta mostra um QR;
              escaneie com o WhatsApp Business do celular (ícone verde).
            </p>
          </div>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="whatsapp-app-id">App ID (WhatsApp)</FieldLabel>
            <Input
              id="whatsapp-app-id"
              value={integrations.whatsappAppId ?? ""}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  whatsappAppId: event.target.value || null,
                }))
              }
              placeholder="App ID do app WhatsApp (não o de Ads)"
              autoComplete="off"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="whatsapp-app-secret">App Secret (WhatsApp)</FieldLabel>
            <SecretInput
              id="whatsapp-app-secret"
              value={secretDrafts.whatsappAppSecret}
              onChange={(event) =>
                setSecretDrafts((current) => ({
                  ...current,
                  whatsappAppSecret: event.target.value,
                }))
              }
              placeholder={
                integrations.hasWhatsappAppSecret
                  ? "Secret configurado — deixe em branco para manter"
                  : "App Secret do app WhatsApp"
              }
              autoComplete="new-password"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="whatsapp-signup-config-id">
              Embedded Signup Configuration ID
            </FieldLabel>
            <Input
              id="whatsapp-signup-config-id"
              value={integrations.whatsappEmbeddedSignupConfigId ?? ""}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  whatsappEmbeddedSignupConfigId: event.target.value || null,
                }))
              }
              placeholder="Facebook Login for Business → Configurations"
              autoComplete="off"
            />
          </Field>
        </FieldGroup>

        <div className="mt-5">
          <WhatsappConnectButton
            key={`${integrations.whatsappAppId ?? ""}-${integrations.whatsappEmbeddedSignupConfigId ?? ""}-${integrations.hasWhatsappAppSecret ? "1" : "0"}`}
            onConnected={(next) =>
              setIntegrations((current) => ({
                ...current,
                whatsappConfigured: next.configured,
                whatsappPhoneNumberId: next.phoneNumberId,
                hasWhatsappApiToken: next.configured,
              }))
            }
          />
        </div>
      </Card>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--atria-accent)]/30 bg-[var(--atria-accent)]/10 px-5 py-4">
        <div className="flex items-center gap-3 text-sm text-[var(--atria-primary)]/70">
          <KeyRound className="size-4 text-[var(--atria-primary)]" />
          <span>
            Tokens são armazenados com criptografia e exibidos parcialmente
            mascarados.
          </span>
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="gap-2 bg-[#004A4A] text-white hover:bg-[#004A4A]/90"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4 text-[#D4BA97]" />
          )}
          {saving ? "Salvando..." : "Salvar integrações"}
        </Button>
      </div>
    </form>
  );
}
