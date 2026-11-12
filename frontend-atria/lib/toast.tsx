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

// Todo aviso do sistema passa por aqui e usa o mesmo cartão do toast do financeiro.
function show(
  variant: AppToastVariant,
  title: ReactNode,
  options: AppToastOptions = {},
) {
  const { id, description, action, duration } = options;

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
    { id, duration },
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

  return status >= 400;
}

export function showApiError(error: ApiError, endpoint?: string) {
  if (endpoint?.startsWith("/auth/login")) {
    toast.error("E-mail ou senha inválidos");
    return;
  }

  const payload = error.data as
    | { errors?: string[]; message?: string | string[] }
    | undefined;
  const validationDetail =
    payload?.errors?.[0] ??
    (Array.isArray(payload?.message) ? payload.message[0] : undefined);

  const message =
    error.message === "Validation failed" && validationDetail
      ? validationDetail
      : error.message || "Ocorreu um erro inesperado. Tente novamente.";

  toast.error(message);
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  return fallback;
}
