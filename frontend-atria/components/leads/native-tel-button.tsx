"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { toTelHref } from "@/lib/lead-phone";

type NativeTelButtonProps = ComponentProps<typeof Button> & {
  phone?: string | null;
};

export function NativeTelButton({
  phone,
  type,
  nativeButton,
  ...props
}: NativeTelButtonProps) {
  const href = toTelHref(phone ?? null);

  return (
    <Button
      {...props}
      type={href ? undefined : type}
      nativeButton={href ? false : nativeButton}
      render={href ? <a href={href} /> : undefined}
    />
  );
}
