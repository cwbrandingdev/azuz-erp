"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { isMaskedSecretPreview } from "@/lib/secret-field";
import { cn } from "@/lib/utils";

interface SecretInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "type"
> {
  containerClassName?: string;
}

export function SecretInput({
  className,
  containerClassName,
  value,
  ...props
}: SecretInputProps) {
  const [visible, setVisible] = useState(false);
  const stringValue = typeof value === "string" ? value : "";
  const hasMaskedPreview = isMaskedSecretPreview(stringValue);
  const hasValue = stringValue.trim().length > 0;
  const showToggle = hasMaskedPreview || hasValue;

  return (
    <div className={cn("relative", containerClassName)}>
      <Input
        {...props}
        value={stringValue}
        type={visible ? "text" : "password"}
        className={cn("pr-10 font-mono text-sm", className)}
      />
      {showToggle ? (
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-[var(--atria-primary)]/45 transition-colors hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)]"
          aria-label={visible ? "Ocultar valor" : "Mostrar valor"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      ) : null}
      {hasMaskedPreview && !visible ? (
        <p className="mt-1 text-xs text-[var(--atria-primary)]/45">
          Chave salva (exibição parcial por segurança). Cole um novo valor para
          substituir.
        </p>
      ) : null}
    </div>
  );
}
