"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  detectNativeDialerPlatform,
  markNativeDialerSetupSeen,
  type NativeDialerPlatform,
} from "@/lib/native-dialer";

const LINK_TO_WINDOWS =
  "https://play.google.com/store/apps/details?id=com.microsoft.appmanager";
const KDE_CONNECT_ANDROID =
  "https://play.google.com/store/apps/details?id=org.kde.kdeconnect_tp";
const GSCONNECT =
  "https://extensions.gnome.org/extension/1319/gsconnect/";

function stepsFor(platform: NativeDialerPlatform) {
  if (platform === "linux") {
    return {
      title: "Ligar pelo celular (Linux)",
      description:
        "O Atria abre o número no Android. No Ubuntu isso passa pelo GSConnect.",
      steps: [
        <>
          No Android, instale o{" "}
          <a href={KDE_CONNECT_ANDROID} target="_blank" rel="noreferrer">
            KDE Connect
          </a>
          .
        </>,
        <>
          No Ubuntu, instale o{" "}
          <a href={GSCONNECT} target="_blank" rel="noreferrer">
            GSConnect
          </a>{" "}
          e pareie no mesmo Wi‑Fi.
        </>,
        "No Chromium, ao clicar Ligar, escolha GSConnect e marque sempre.",
      ],
    };
  }

  if (platform === "android") {
    return {
      title: "Ligar por este celular",
      description:
        "Você está no Android. O Atria abre o discador deste aparelho.",
      steps: [
        "Toque em Ligar. Se o Android perguntar, escolha Telefone.",
        "Fale no celular e volte ao Atria para registrar o resultado.",
      ],
    };
  }

  return {
    title: "Ligar pelo Windows 11 + Android",
    description:
      "O Atria envia o número para o Phone Link. A ligação sai no chip do Android.",
    steps: [
      <>
        No Android, instale o{" "}
        <a href={LINK_TO_WINDOWS} target="_blank" rel="noreferrer">
          Link para Windows
        </a>{" "}
        (em Samsung costuma vir instalado).
      </>,
      "No PC, abra o app Phone Link, entre com a mesma conta Microsoft e ative Chamadas. Bluetooth ligado, celular perto.",
      "Em Configurações → Apps → Apps padrão, associe tel ao Phone Link.",
      "No Chrome, ao clicar Ligar, escolha Phone Link e marque sempre.",
    ],
  };
}

interface DialerNativeSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DialerNativeSetupDialog({
  open,
  onOpenChange,
}: DialerNativeSetupDialogProps) {
  const platform = detectNativeDialerPlatform();
  const copy = stepsFor(platform);

  function handleOpenChange(next: boolean) {
    if (!next) markNativeDialerSetupSeen();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-4 text-sm text-[var(--atria-primary)]/80">
          {copy.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Pronto, já configurei
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
