"use client";

import { Loader2, Search } from "lucide-react";
import { BRAZIL_STATES } from "@/lib/brazil-states";
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

export interface MapsSearchFormValues {
  category: string;
  uf: string;
  city: string;
  neighborhood: string;
}

interface MapsSearchFormProps {
  values: MapsSearchFormValues;
  loading?: boolean;
  searchProgress?: number | null;
  jobStatus?: string | null;
  categoryError?: string | null;
  className?: string;
  onChange: (values: MapsSearchFormValues) => void;
  onSubmit: () => void;
}

export function MapsSearchForm({
  values,
  loading,
  searchProgress = null,
  jobStatus,
  categoryError,
  className,
  onChange,
  onSubmit,
}: MapsSearchFormProps) {
  const baseLoadingLabel =
    jobStatus === "processing"
      ? "Buscando empresas"
      : jobStatus === "pending"
        ? "Aguardando busca alternativa"
        : "Procurando";
  const loadingLabel =
    typeof searchProgress === "number"
      ? `${baseLoadingLabel}… ${Math.round(searchProgress)}%`
      : `${baseLoadingLabel}...`;

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
                <FieldLabel htmlFor="maps-category">Nicho</FieldLabel>
                <Input
                  id="maps-category"
                  value={values.category}
                  onChange={(event) =>
                    onChange({ ...values, category: event.target.value })
                  }
                  placeholder="Ex.: restaurante, clínica, estética"
                  required
                  aria-invalid={Boolean(categoryError)}
                />
                {categoryError ? (
                  <p className="mt-1.5 text-xs text-destructive">{categoryError}</p>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="maps-uf">Estado</FieldLabel>
                <Select
                  value={values.uf}
                  onValueChange={(uf) => {
                    if (uf) onChange({ ...values, uf });
                  }}
                >
                  <SelectTrigger id="maps-uf" className="h-10 w-full">
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
                <FieldLabel htmlFor="maps-city">Cidade</FieldLabel>
                <Input
                  id="maps-city"
                  value={values.city}
                  onChange={(event) =>
                    onChange({ ...values, city: event.target.value })
                  }
                  placeholder="Ex.: São Paulo"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="maps-neighborhood">
                  Bairro (opcional)
                </FieldLabel>
                <Input
                  id="maps-neighborhood"
                  value={values.neighborhood}
                  onChange={(event) =>
                    onChange({ ...values, neighborhood: event.target.value })
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
                  {loadingLabel}
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
