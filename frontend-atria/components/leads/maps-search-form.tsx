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

export interface MapsSearchFormValues {
  category: string;
  uf: string;
  city: string;
  neighborhood: string;
}

interface MapsSearchFormProps {
  values: MapsSearchFormValues;
  loading?: boolean;
  jobStatus?: string | null;
  className?: string;
  onChange: (values: MapsSearchFormValues) => void;
  onSubmit: () => void;
}

export function MapsSearchForm({
  values,
  loading,
  jobStatus,
  className,
  onChange,
  onSubmit,
}: MapsSearchFormProps) {
  const loadingLabel =
    jobStatus === "processing"
      ? "Processando busca..."
      : jobStatus === "pending"
        ? "Aguardando busca..."
        : "Procurando empresas...";

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
            Informe a categoria, a cidade e o estado. Os resultados vêm do
            Google Maps, com telefone, site e Instagram quando existirem.
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
                <FieldLabel htmlFor="maps-category">
                  Qual categoria você quer buscar?
                </FieldLabel>
                <Input
                  id="maps-category"
                  value={values.category}
                  onChange={(event) =>
                    onChange({ ...values, category: event.target.value })
                  }
                  placeholder="Ex.: Restaurante, clínica, estética"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="maps-uf">Em qual estado?</FieldLabel>
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
                <FieldLabel htmlFor="maps-city">Em qual cidade?</FieldLabel>
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
                <FieldLabel htmlFor="maps-neighborhood">Bairro</FieldLabel>
                <Input
                  id="maps-neighborhood"
                  value={values.neighborhood}
                  onChange={(event) =>
                    onChange({ ...values, neighborhood: event.target.value })
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
                {loadingLabel}
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
