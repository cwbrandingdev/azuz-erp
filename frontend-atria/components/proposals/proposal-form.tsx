"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Save, Send, Trash2 } from "lucide-react";
import { ShareLinkModal } from "@/components/proposals/share-link-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_COVER_IMAGE_URL,
  DEFAULT_COVER_VIDEO_URL,
  DEFAULT_SCHEDULING_URL,
  DEFAULT_STRUCTURE_CONTENT,
  formatProposalCurrency,
  getPlanFormDefaults,
  LOCAL_SPACE_IMAGES,
  PROPOSAL_PLAN_OPTIONS,
  PROPOSAL_PRICING_PLANS,
  slugifyCompanyName,
  type ProposalPlanId,
  toDateInputValue,
} from "@/lib/proposal-utils";
import { toast } from "@/lib/toast";
import { proposalsService } from "@/services";
import type { Proposal } from "@/services/types";

export interface ProposalFormValues {
  planId: ProposalPlanId;
  companyName: string;
  title: string;
  validUntil: string;
  totalValue: number;
  coverVideoUrl: string;
  coverImageUrl: string;
  schedulingUrl: string;
  items: {
    name: string;
    description: string;
  }[];
  projects: {
    title: string;
    description: string;
    imageUrl: string;
    projectUrl: string;
  }[];
}

interface ProposalFormProps {
  proposal?: Proposal;
}

function detectPlanId(proposal: Proposal): ProposalPlanId {
  const matchedPlan = PROPOSAL_PRICING_PLANS.find(
    (plan) =>
      plan.name === proposal.title &&
      plan.price === proposal.totalValue &&
      plan.items.length === proposal.items.length,
  );
  return matchedPlan?.id ?? "custom";
}

function buildDefaults(proposal?: Proposal): ProposalFormValues {
  if (!proposal) {
    const planDefaults = getPlanFormDefaults("posicionamento");
    return {
      planId: "posicionamento",
      companyName: "",
      title: planDefaults.title,
      validUntil: "",
      totalValue: planDefaults.totalValue,
      coverVideoUrl: DEFAULT_COVER_VIDEO_URL,
      coverImageUrl: DEFAULT_COVER_IMAGE_URL,
      schedulingUrl: DEFAULT_SCHEDULING_URL,
      items: planDefaults.items,
      projects: [],
    };
  }

  return {
    planId: detectPlanId(proposal),
    companyName: proposal.companyName,
    title: proposal.title,
    validUntil: toDateInputValue(proposal.validUntil),
    totalValue: proposal.totalValue,
    coverVideoUrl: proposal.coverVideoUrl ?? DEFAULT_COVER_VIDEO_URL,
    coverImageUrl: proposal.coverImageUrl ?? DEFAULT_COVER_IMAGE_URL,
    schedulingUrl: proposal.schedulingUrl ?? DEFAULT_SCHEDULING_URL,
    items: proposal.items.map((item) => ({
      name: item.name,
      description: item.description ?? "",
    })),
    projects: proposal.projects.map((project) => ({
      title: project.title,
      description: project.description ?? "",
      imageUrl: project.imageUrl ?? "",
      projectUrl: project.projectUrl ?? "",
    })),
  };
}

function toPayload(values: ProposalFormValues) {
  const items = values.items
    .filter((item) => item.name.trim())
    .map((item, index) => ({
      name: item.name.trim(),
      description: item.description.trim() || undefined,
      quantity: 1,
      unitPrice: 0,
      sortOrder: index,
    }));

  return {
    companyName: values.companyName.trim(),
    title: values.title.trim(),
    validUntil: values.validUntil || undefined,
    totalValue: Number(values.totalValue) || 0,
    structureContent: DEFAULT_STRUCTURE_CONTENT,
    structureImageUrls: LOCAL_SPACE_IMAGES.map((image) => image.src),
    coverVideoUrl: values.coverVideoUrl.trim() || undefined,
    coverImageUrl: values.coverImageUrl.trim() || undefined,
    schedulingUrl: values.schedulingUrl.trim() || undefined,
    items,
    projects: values.projects
      .filter((project) => project.title.trim())
      .map((project, index) => ({
        title: project.title.trim(),
        description: project.description.trim() || undefined,
        imageUrl: project.imageUrl.trim() || undefined,
        projectUrl: project.projectUrl.trim() || undefined,
        sortOrder: index,
      })),
  };
}

export function ProposalForm({ proposal }: ProposalFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
  } = useForm<ProposalFormValues>({
    defaultValues: buildDefaults(proposal),
  });

  const itemsArray = useFieldArray({ control, name: "items" });
  const projectsArray = useFieldArray({ control, name: "projects" });

  const planId = watch("planId");
  const companyName = watch("companyName");
  const totalValue = watch("totalValue");
  const previewSlug = slugifyCompanyName(companyName || "");

  useEffect(() => {
    if (proposal) return;
    const defaults = getPlanFormDefaults(planId);
    setValue("title", defaults.title);
    setValue("totalValue", defaults.totalValue);
    setValue("items", defaults.items);
  }, [planId, proposal, setValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("proposalShareUrl");
    if (stored) {
      setShareUrl(stored);
      sessionStorage.removeItem("proposalShareUrl");
    }
  }, []);

  function handlePlanChange(nextPlanId: ProposalPlanId) {
    setValue("planId", nextPlanId);
    if (nextPlanId === "custom") return;

    const defaults = getPlanFormDefaults(nextPlanId);
    setValue("title", defaults.title);
    setValue("totalValue", defaults.totalValue);
    setValue("items", defaults.items);
  }

  async function saveDraft(values: ProposalFormValues) {
    setSaving(true);
    try {
      const payload = toPayload(values);
      if (!payload.companyName) {
        toast.error("Informe o nome da empresa");
        return;
      }
      if (!payload.title) {
        toast.error("Informe o título da proposta");
        return;
      }

      if (proposal) {
        await proposalsService.updateProposal(proposal.id, {
          ...payload,
          status: "draft",
        });
        toast.success("Rascunho salvo");
        router.refresh();
      } else {
        const created = await proposalsService.createProposal({
          ...payload,
          status: "draft",
        });
        toast.success("Rascunho criado");
        router.push(`/proposals/${created.id}/edit`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a proposta",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publish(values: ProposalFormValues) {
    setPublishing(true);
    try {
      const payload = toPayload(values);
      if (!payload.companyName) {
        toast.error("Informe o nome da empresa antes de publicar");
        return;
      }
      if (!payload.title) {
        toast.error("Informe o título antes de publicar");
        return;
      }
      if (!payload.items.length) {
        toast.error("Adicione ao menos um serviço");
        return;
      }
      if (!payload.totalValue || payload.totalValue <= 0) {
        toast.error("Informe o valor total da proposta");
        return;
      }

      let proposalId = proposal?.id;
      if (proposalId) {
        await proposalsService.updateProposal(proposalId, payload);
      } else {
        const created = await proposalsService.createProposal({
          ...payload,
          status: "draft",
        });
        proposalId = created.id;
      }

      const published = await proposalsService.publishProposal(proposalId);
      const url = proposalsService.buildPublicProposalUrl(published.slug);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("proposalShareUrl", url);
      }
      setShareUrl(url);
      toast.success("Proposta publicada");
      if (!proposal || proposal.id !== published.id) {
        router.replace(`/proposals/${published.id}/edit`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar a proposta",
      );
    } finally {
      setPublishing(false);
    }
  }

  const selectedPlan = PROPOSAL_PRICING_PLANS.find((plan) => plan.id === planId);

  return (
    <>
      <form className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
              {proposal ? "Editar proposta" : "Nova proposta"}
            </h1>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Escolha um plano ou monte uma proposta personalizada
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving || publishing}
              onClick={() => void handleSubmit(saveDraft)()}
            >
              <Save className="size-4" />
              Salvar rascunho
            </Button>
            <Button
              type="button"
              disabled={saving || publishing}
              onClick={() => void handleSubmit(publish)()}
            >
              <Send className="size-4" />
              Publicar
            </Button>
          </div>
        </div>

        <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--atria-primary)]/50">
            Plano
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROPOSAL_PLAN_OPTIONS.map((option) => {
              const plan = PROPOSAL_PRICING_PLANS.find(
                (entry) => entry.id === option.id,
              );
              const selected = planId === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePlanChange(option.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5 ring-1 ring-[var(--atria-primary)]"
                      : "border-[var(--atria-primary)]/10 hover:border-[var(--atria-primary)]/30"
                  }`}
                >
                  <p className="font-semibold text-[var(--atria-primary)]">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--atria-primary)]/50">
                    {option.description}
                  </p>
                  {plan ? (
                    <p className="mt-3 text-sm font-medium text-[var(--atria-primary)]">
                      {formatProposalCurrency(plan.price)}/mês
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
          {selectedPlan ? (
            <p className="mt-4 text-sm text-[var(--atria-primary)]/60">
              {selectedPlan.description}
            </p>
          ) : null}
        </Card>

        <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--atria-primary)]/50">
            Dados da proposta
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Nome da empresa</FieldLabel>
              <Input
                placeholder="Ex: Empresa ABC"
                {...register("companyName", { required: true })}
              />
              {proposal?.slug || previewSlug ? (
                <p className="text-xs text-[var(--atria-primary)]/45">
                  Link público: /p/{proposal?.slug ?? previewSlug}
                </p>
              ) : null}
            </Field>

            <Field>
              <FieldLabel>Título</FieldLabel>
              <Input
                placeholder="Proposta Comercial — Posicionamento"
                {...register("title", { required: true })}
              />
            </Field>

            <Field>
              <FieldLabel>Validade</FieldLabel>
              <Input type="date" {...register("validUntil")} />
            </Field>

            <Field>
              <FieldLabel>Valor total</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("totalValue", { valueAsNumber: true })}
              />
              {totalValue > 0 ? (
                <p className="text-xs text-[var(--atria-primary)]/45">
                  {formatProposalCurrency(totalValue)}
                </p>
              ) : null}
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Link de agendamento</FieldLabel>
              <Input
                placeholder="https://calendly.com/..."
                {...register("schedulingUrl")}
              />
            </Field>
          </div>
        </Card>

        <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--atria-primary)]/50">
                Serviços incluídos
              </h2>
              <p className="mt-1 text-xs text-[var(--atria-primary)]/45">
                Lista de serviços da proposta — o valor é definido apenas no
                total acima
              </p>
            </div>
            {planId === "custom" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  itemsArray.append({
                    name: "",
                    description: "",
                  })
                }
              >
                <Plus className="size-4" />
                Serviço
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {itemsArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-start gap-2 rounded-xl border border-[var(--atria-primary)]/10 p-3"
              >
                <div className="grid flex-1 gap-2">
                  <Input
                    placeholder="Nome do serviço"
                    readOnly={planId !== "custom"}
                    {...register(`items.${index}.name` as const)}
                  />
                  {planId === "custom" && (
                    <Input
                      placeholder="Descrição (opcional)"
                      {...register(`items.${index}.description` as const)}
                    />
                  )}
                </div>
                {planId === "custom" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={itemsArray.fields.length === 1}
                    onClick={() => itemsArray.remove(index)}
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--atria-primary)]/50">
              Projetos em destaque
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                projectsArray.append({
                  title: "",
                  description: "",
                  imageUrl: "",
                  projectUrl: "",
                })
              }
            >
              <Plus className="size-4" />
              Projeto
            </Button>
          </div>

          {projectsArray.fields.length === 0 ? (
            <p className="text-sm text-[var(--atria-primary)]/45">
              Adicione projetos para exibir na seção pública.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {projectsArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-xl border border-[var(--atria-primary)]/10 p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 gap-2 md:grid-cols-2">
                      <Input
                        placeholder="Título do projeto"
                        {...register(`projects.${index}.title` as const)}
                      />
                      <Input
                        placeholder="URL da imagem"
                        {...register(`projects.${index}.imageUrl` as const)}
                      />
                      <Input
                        className="md:col-span-2"
                        placeholder="Descrição"
                        {...register(`projects.${index}.description` as const)}
                      />
                      <Input
                        className="md:col-span-2"
                        placeholder="URL do projeto (opcional)"
                        {...register(`projects.${index}.projectUrl` as const)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => projectsArray.remove(index)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </form>

      <ShareLinkModal
        open={Boolean(shareUrl)}
        onOpenChange={(open) => {
          if (!open) setShareUrl(null);
        }}
        publicUrl={shareUrl ?? ""}
      />
    </>
  );
}
