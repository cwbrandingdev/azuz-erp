import { describeApiError, type FriendlyApiError } from "@/lib/api-error";
import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import {
  AppToast,
  type AppToastAction,
  type AppToastVariant,
} from "@/components/ui/app-toast";
import { ApiError } from "@/services/api";

interface AppToastOptions {
  id?: string | number;
  description?: ReactNode;
  action?: AppToastAction;
  duration?: number;
}

let toastSequence = 0;
// Todo aviso do sistema passa por aqui e usa o mesmo cartão do toast do financeiro.
function show(
  variant: AppToastVariant,
  title: ReactNode,
  options: AppToastOptions = {},
) {
  const { description, action, duration } = options;

  const id = options.id ?? `app-toast-${++toastSequence}`;

  return sonnerToast.custom(
    (toastId) => (
      <AppToast
        variant={variant}
        title={title}
        description={description}
        action={
          action && {
            label: action.label,
            onClick: () => {
              sonnerToast.dismiss(toastId);
              action.onClick();
            },
          }
        }
        onClose={() => sonnerToast.dismiss(toastId)}
      />
    ),
    duration === undefined ? { id } : { id, duration },
  );
}

export const toast = {
  success: (title: ReactNode, options?: AppToastOptions) =>
    show("success", title, options),
  error: (title: ReactNode, options?: AppToastOptions) =>
    show("error", title, options),
  info: (title: ReactNode, options?: AppToastOptions) =>
    show("info", title, options),
  warning: (title: ReactNode, options?: AppToastOptions) =>
    show("warning", title, options),
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
};

const SILENT_ENDPOINTS = ["/auth/refresh"];

const SILENT_ERROR_MESSAGE_FRAGMENTS = [
  "usuários client só podem acessar",
];

export function shouldShowApiErrorToast(
  status: number,
  endpoint: string,
  message?: string,
): boolean {
  if (SILENT_ENDPOINTS.some((path) => endpoint.startsWith(path))) {
    return false;
  }

  if (status === 401 && endpoint.startsWith("/auth/refresh")) {
    return false;
  }

  if (
    message &&
    SILENT_ERROR_MESSAGE_FRAGMENTS.some((fragment) =>
      message.toLowerCase().includes(fragment),
    )
  ) {
    return false;
  }

  return status === 0 || status >= 400;
}

const REPLACEABLE_KINDS = new Set<FriendlyApiError["kind"]>([
  "network",
  "timeout",
  "rate-limit",
  "server",
]);

function copyReference(reference: string) {
  void navigator.clipboard.writeText(reference).then(
    () => toast.success("Código copiado"),
    () => toast.error("Não foi possível copiar o código"),
  );
}

function ErrorDescription({ friendly }: { friendly: FriendlyApiError }) {
  return (
    <>
      {friendly.description ? (
        <span className="block">{friendly.description}</span>
      ) : null}
      {friendly.details?.length ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {friendly.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {friendly.reference ? (
        <span className="mt-1 block font-mono text-xs">
          Código: {friendly.reference}
        </span>
      ) : null}
    </>
  );
}

export function showApiError(error: ApiError, endpoint?: string) {
  const friendly = describeApiError(error, endpoint);
  const reference = friendly.reference;
  const hasDescription = Boolean(
    friendly.description || friendly.details?.length || reference,
  );

  toast.error(friendly.title, {
    id: REPLACEABLE_KINDS.has(friendly.kind)
      ? `api-error-${friendly.kind}`
      : undefined,
    description: hasDescription ? (
      <ErrorDescription friendly={friendly} />
    ) : undefined,
    action: reference
      ? { label: "Copiar código", onClick: () => copyReference(reference) }
      : undefined,
    duration: reference ? 12_000 : undefined,
  });
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const friendly = describeApiError(error);
  return friendly.details?.[0] ?? friendly.description ?? friendly.title;
}