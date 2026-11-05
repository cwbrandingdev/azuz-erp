"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { toVivoDialString } from "@/lib/lead-phone";
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

  return (
    <Button
      {...props}
      type={href ? undefined : type}
      nativeButton={href ? false : nativeButton}
      render={href ? <a href={href} /> : undefined}
      onClick={(event) => {
        if (detectNativeDialerPlatform() === "windows") {
          const dial = toVivoDialString(phone);
          if (dial) {
            void navigator.clipboard.writeText(dial).catch(() => undefined);
          }
        }
        onClick?.(event);
      }}
    />
  );
}
