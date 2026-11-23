"use client";

import { Loader2, Search } from "lucide-react";
import { PROSPECT_CATALOG_STATES } from "@/lib/prospect-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  searchProgress?: number | null;
  className?: string;
  onChange: (values: CompanySearchFormValues) => void;
  onSubmit: () => void;
}

export function CompanySearchForm({
  values,
  loading,
  searchProgress = null,
  className,
  onChange,
  onSubmit,
}: CompanySearchFormProps) {
  return (
    <Card
      className={`flex shrink-0 flex-col overflow-visible rounded-2xl border border-[var(--atria-primary)]/10 ${className ?? ""}`}
    >
      <CardContent className="flex flex-col pt-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor="company-query-value">
                  Nicho ou CNAE
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
                <FieldLabel htmlFor="company-uf">Estado</FieldLabel>
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
                    {PROSPECT_CATALOG_STATES.map((state) => (
                      <SelectItem key={state.uf} value={state.uf}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="company-city">Cidade</FieldLabel>
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
                <FieldLabel htmlFor="company-address">
                  Bairro (opcional)
                </FieldLabel>
                <Input
                  id="company-address"
                  value={values.address}
                  onChange={(event) =>
                    onChange({ ...values, address: event.target.value })
                  }
                  placeholder="Ex.: Pinheiros"
                />
              </Field>
            </div>
          </FieldGroup>

          <div className="sticky bottom-0 z-10 bg-card pt-1">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {typeof searchProgress === "number"
                    ? `Procurando… ${Math.round(searchProgress)}%`
                    : "Procurando..."}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar empresas
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
