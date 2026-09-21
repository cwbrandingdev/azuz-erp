"use client";

import { useEffect, useState, type ComponentProps, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { toE164 } from "@/lib/lead-phone";
import {
  detectNativeDialerPlatform,
  toNativeCallHref,
} from "@/lib/native-dialer";

type NativeTelButtonProps = ComponentProps<typeof Button> & {
  phone?: string | null;
};

export function NativeTelButton({
  phone,
  type,
  nativeButton,
  onClick,
  ...props
}: NativeTelButtonProps) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    setHref(toNativeCallHref(phone ?? null));
  }, [phone]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (detectNativeDialerPlatform() === "windows") {
      const e164 = toE164(phone);
      if (e164) void navigator.clipboard.writeText(e164).catch(() => undefined);
    }
    onClick?.(event);
  }

  return (
    <Button
      {...props}
      type={href ? undefined : type}
      nativeButton={href ? false : nativeButton}
      render={href ? <a href={href} /> : undefined}
      onClick={handleClick}
    />
  );
}
