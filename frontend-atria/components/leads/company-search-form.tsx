"use client";

import type { ChangeEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BRAZIL_STATES } from "@/lib/brazil-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CnaeSearchSelect } from "@/components/leads/cnae-search-select";
import { CompanySearchTabs } from "@/components/leads/company-search-tabs";
import type { LeadSearchQueryType } from "@/services/company-search.service";

export type CompanyBatchSearchMode = "none" | "categoria" | "bairro";

export interface CompanySearchFormValues {
  queryType: LeadSearchQueryType;
  queryValue: string;
  cnaeLabel: string;
  city: string;
  uf: string;
  address: string;
  batchSearchMode: CompanyBatchSearchMode;
  batchTerms: string;
}

interface CompanySearchFormProps {
  values: CompanySearchFormValues;
  loading?: boolean;
  className?: string;
  onChange: (values: CompanySearchFormValues) => void;
  onQueryTypeChange: (queryType: LeadSearchQueryType) => void;
  onSubmit: () => void;
}

export function CompanySearchForm({
  values,
  loading,
  className,
  onChange,
  onQueryTypeChange,
  onSubmit,
}: CompanySearchFormProps) {
  const isNiche = values.queryType === "NICHO";

  return (
    <Card
      className={`flex h-full flex-col rounded-2xl border border-[var(--atria-primary)]/10 ${className ?? ""}`}
    >
      <CardHeader className="space-y-4 pb-3 sm:pb-6">
        <div className="space-y-1">
          <CardTitle className="text-base">O que você está procurando?</CardTitle>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Preencha os campos abaixo e clique em buscar. Os resultados
            aparecerão no mapa ao lado e na lista abaixo.
          </p>
        </div>
        <CompanySearchTabs
          activeTab={values.queryType}
          onChange={onQueryTypeChange}
        />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex flex-1 flex-col gap-4"
        >
          <FieldGroup className="flex-1">
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor="company-query-value">
                  {isNiche
                    ? "Qual nicho você gostaria de procurar?"
                    : "Qual CNAE você quer buscar?"}
                </FieldLabel>
                {isNiche ? (
                  <Input
                    id="company-query-value"
                    value={values.queryValue}
                    onChange={(event) =>
                      onChange({ ...values, queryValue: event.target.value })
                    }
                    placeholder="Ex.: restaurante, clínica odontológica, academia"
                    required={
                      values.batchSearchMode !== "bairro" &&
                      values.batchSearchMode !== "categoria"
                    }
                  />
                ) : (
                  <CnaeSearchSelect
                    id="company-query-value"
                    value={values.queryValue}
                    label={values.cnaeLabel}
                    onValueChange={(code, description) =>
                      onChange({
                        ...values,
                        queryValue: code,
                        cnaeLabel: description,
                      })
                    }
                  />
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="company-city">
                  Em qual cidade?
                </FieldLabel>
                <Input
                  id="company-city"
                  value={values.city}
                  onChange={(event) =>
                    onChange({ ...values, city: event.target.value })
                  }
                  placeholder="Ex.: Curitiba"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="company-uf">Em qual estado?</FieldLabel>
                <Select
                  value={values.uf}
                  onValueChange={(uf) => {
                    if (uf) onChange({ ...values, uf });
                  }}
                >
                  <SelectTrigger id="company-uf" className="h-10 w-full">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZIL_STATES.map((state) => (
                      <SelectItem key={state.uf} value={state.uf}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="company-address">Bairro</FieldLabel>
                <Input
                  id="company-address"
                  value={values.address}
                  onChange={(event) =>
                    onChange({ ...values, address: event.target.value })
                  }
                  placeholder="Ex.: Pinheiros (opcional na busca simples)"
                  disabled={values.batchSearchMode === "bairro"}
                />
              </Field>
              {isNiche && (
                <div className="space-y-3">
                  <FieldLabel>Buscar vários de uma vez</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "none" as const, label: "Busca simples" },
                        { id: "categoria" as const, label: "Várias categorias" },
                        { id: "bairro" as const, label: "Vários bairros" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          onChange({
                            ...values,
                            batchSearchMode: option.id,
                            batchTerms:
                              option.id === "none" ? "" : values.batchTerms,
                          })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          values.batchSearchMode === option.id
                            ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/10 text-[var(--atria-primary)]"
                            : "border-[var(--atria-primary)]/15 text-[var(--atria-primary)]/60 hover:border-[var(--atria-primary)]/30"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {values.batchSearchMode !== "none" && (
                    <textarea
                      id="company-batch-terms"
                      value={values.batchTerms}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        onChange({ ...values, batchTerms: event.target.value })
                      }
                      placeholder={
                        values.batchSearchMode === "categoria"
                          ? "Uma categoria por linha (ex.: restaurante, pet shop)"
                          : "Um bairro por linha (ex.: Centro, Batel)"
                      }
                      rows={4}
                      className={cn(inputClassName, "min-h-24 resize-y py-2")}
                    />
                  )}
                  {values.batchSearchMode === "categoria" && (
                    <p className="text-xs text-[var(--atria-primary)]/50">
                      O bairro acima (se informado) vale para todas as
                      categorias.
                    </p>
                  )}
                  {values.batchSearchMode === "bairro" && (
                    <p className="text-xs text-[var(--atria-primary)]/50">
                      A categoria acima vale para todos os bairros listados.
                    </p>
                  )}
                </div>
              )}
            </div>
          </FieldGroup>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procurando empresas...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar empresas
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
