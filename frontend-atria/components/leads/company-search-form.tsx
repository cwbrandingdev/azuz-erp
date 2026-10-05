"use client";

import { Loader2, Search } from "lucide-react";
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
import type { LeadSearchQueryType } from "@/services/company-search.service";

export interface CompanySearchFormValues {
  queryType: LeadSearchQueryType;
  queryValue: string;
  cnaeLabel: string;
  city: string;
  uf: string;
  address: string;
}

interface CompanySearchFormProps {
  values: CompanySearchFormValues;
  loading?: boolean;
  className?: string;
  onChange: (values: CompanySearchFormValues) => void;
  onSubmit: () => void;
}

export function CompanySearchForm({
  values,
  loading,
  className,
  onChange,
  onSubmit,
}: CompanySearchFormProps) {
  return (
    <Card
      className={`flex h-full flex-col rounded-2xl border border-[var(--atria-primary)]/10 ${className ?? ""}`}
    >
      <CardHeader className="space-y-4 pb-3 sm:pb-6">
        <div className="space-y-1">
          <CardTitle className="text-base">
            O que você está procurando?
          </CardTitle>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Escolha o CNAE (incluindo subclasses, como estética), a cidade e
            o estado. Os resultados vêm só do catálogo da Receita.
          </p>
        </div>
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
                  Qual CNAE você quer buscar?
                </FieldLabel>
                <CnaeSearchSelect
                  id="company-query-value"
                  value={values.queryValue}
                  label={values.cnaeLabel}
                  onValueChange={(code, description) =>
                    onChange({
                      ...values,
                      queryType: "CNAE",
                      queryValue: code,
                      cnaeLabel: description,
                    })
                  }
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
                <FieldLabel htmlFor="company-city">Em qual cidade?</FieldLabel>
                <Input
                  id="company-city"
                  value={values.city}
                  onChange={(event) =>
                    onChange({ ...values, city: event.target.value })
                  }
                  placeholder="Ex.: São Paulo"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="company-address">Bairro</FieldLabel>
                <Input
                  id="company-address"
                  value={values.address}
                  onChange={(event) =>
                    onChange({ ...values, address: event.target.value })
                  }
                  placeholder="Ex.: Pinheiros (opcional)"
                />
              </Field>
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
