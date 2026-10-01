"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";

function parseSelectOptions(children: React.ReactNode): SearchableSelectOption[] {
  const options: SearchableSelectOption[] = [];

  function walk(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (child) => {
      if (
        !React.isValidElement<{
          value?: string;
          disabled?: boolean;
          children?: React.ReactNode;
        }>(child)
      ) {
        return;
      }

      if (child.type === React.Fragment) {
        walk(child.props.children);
        return;
      }

      if (child.type === "option") {
        options.push({
          value: String(child.props.value ?? ""),
          label: String(child.props.children ?? ""),
          disabled: child.props.disabled,
        });
      }
    });
  }

  walk(children);
  return options;
}

function NativeSelect({
  className,
  children,
  value,
  onChange,
  disabled,
  id,
  loading = false,
  ...props
}: React.ComponentProps<"select"> & { loading?: boolean }) {
  const options = parseSelectOptions(children);
  const hasEmptyOption = options.some((option) => option.value === "");

  return (
    <SearchableSelect
      id={id}
      className={cn(className)}
      value={String(value ?? "")}
      onValueChange={(nextValue) => {
        onChange?.({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
      options={options.filter((option) => option.value !== "")}
      allowEmpty={hasEmptyOption}
      emptyOptionLabel={
        options.find((option) => option.value === "")?.label ?? "Nenhum"
      }
      disabled={disabled}
      loading={loading}
      placeholder={props["aria-label"]?.toString() ?? "Selecione..."}
    />
  );
}

export { NativeSelect, SearchableSelect };
