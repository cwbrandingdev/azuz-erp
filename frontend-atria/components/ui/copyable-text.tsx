"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

async function copyToClipboard(text: string, label: string) {
  await navigator.clipboard.writeText(text);
  toast.success(`${label} copiado`);
}

interface CopyableTextProps {
  value: string | null | undefined;
  /** Shown in the UI (defaults to `value`). */
  display?: string | null;
  /** Toast label, e.g. "Telefone". */
  copyLabel?: string;
  className?: string;
  textClassName?: string;
  href?: string;
  /** Clicking the text copies (default true when no href). */
  copyOnTextClick?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent) => void;
}

export function CopyableText({
  value,
  display,
  copyLabel = "Texto",
  className,
  textClassName,
  href,
  copyOnTextClick = !href,
  title,
  onClick,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const copyValue = trimmed;
  const shown = display?.trim() || copyValue;

  async function handleCopy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await copyToClipboard(copyValue, copyLabel);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(`Não foi possível copiar ${copyLabel.toLowerCase()}.`);
    }
  }

  const textClasses = cn(
    "min-w-0 flex-1 truncate text-inherit",
    copyOnTextClick && !href && "cursor-pointer hover:underline",
    textClassName,
  );

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(textClasses, "underline-offset-2 hover:underline")}
          title={title ?? shown}
          onClick={onClick}
        >
          {shown}
        </a>
      ) : copyOnTextClick ? (
        <button
          type="button"
          className={cn(textClasses, "text-left")}
          title={title ?? `Copiar ${copyLabel.toLowerCase()}`}
          onClick={(event) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            void handleCopy(event);
          }}
        >
          {shown}
        </button>
      ) : (
        <span className={textClasses} title={title ?? shown} onClick={onClick}>
          {shown}
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        title={`Copiar ${copyLabel.toLowerCase()}`}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="size-3.5 text-green-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
