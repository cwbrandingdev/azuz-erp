import { ApiError } from "@/services/api";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "validation"
  | "auth"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limit"
  | "server"
  | "unknown";

export interface FriendlyApiError {
  kind: ApiErrorKind;
  title: string;
  description?: string;
  details?: string[];
  reference?: string;
}

interface ErrorBody {
  message?: string | string[];
  errors?: string[];
  reference?: string;
}

const MAX_DETAILS = 4;

// Algumas mensagens do servidor ainda são escritas em inglês; elas não devem chegar ao usuário.
const ENGLISH_HINT =
  /\b(not found|failed|invalid|unauthorized|forbidden|already exists|required|error)\b/i;

function readBody(error: ApiError): ErrorBody {
  return error.data && typeof error.data === "object"
    ? (error.data as ErrorBody)
    : {};
}

function usableMessage(message: unknown): string | undefined {
  if (typeof message !== "string" || !message.trim()) return undefined;
  return ENGLISH_HINT.test(message) ? undefined : message;
}

function limitDetails(errors: string[]): string[] {
  if (errors.length <= MAX_DETAILS) return errors;
  const hidden = errors.length - MAX_DETAILS;
  return [
    ...errors.slice(0, MAX_DETAILS),
    `e mais ${hidden} ${hidden === 1 ? "campo" : "campos"}`,
  ];
}

export function describeApiError(
  error: unknown,
  endpoint?: string,
): FriendlyApiError {
  if (!(error instanceof ApiError)) {
    return {
      kind: "unknown",
      title: "Algo deu errado",
      description: "Tente de novo. Se continuar, avise o suporte.",
    };
  }

  const body = readBody(error);
  const serverMessage = usableMessage(body.message);
  const { status } = error;

  if (status === 0) {
    return {
      kind: "network",
      title: "Sem conexão com o servidor",
      description: "Verifique sua internet e tente de novo.",
    };
  }

  if (status === 408) {
    return {
      kind: "timeout",
      title: "O servidor demorou a responder",
      description: "Tente de novo em instantes. Se continuar, avise o suporte.",
    };
  }

  if (
    endpoint?.startsWith("/auth/login") &&
    (status === 400 || status === 401)
  ) {
    return {
      kind: "auth",
      title: "E-mail ou senha inválidos",
      description: "Confira os dados e tente de novo.",
    };
  }

  if (status < 500 && Array.isArray(body.errors) && body.errors.length > 0) {
    return {
      kind: "validation",
      title: "Confira os campos",
      details: limitDetails(body.errors),
    };
  }

  if (status >= 500) {
    // Só confiamos no texto do servidor quando ele veio com código de referência,
    // sinal de que passou pelo filtro de erros e não é uma mensagem técnica crua.
    const trusted = body.reference ? serverMessage : undefined;
    const unreachable = status === 502 || status === 503;
    return {
      kind: "server",
      title: unreachable ? "Serviço indisponível" : "Erro no servidor",
      description:
        trusted ??
        (unreachable
          ? "Não foi possível falar com o servidor. Tente de novo em instantes."
          : "Tente de novo. Se continuar, avise o suporte."),
      reference: body.reference,
    };
  }

  switch (status) {
    case 401:
      return {
        kind: "auth",
        title: "Sessão expirada",
        description: "Entre novamente para continuar.",
      };
    case 403:
      return {
        kind: "forbidden",
        title: "Sem permissão",
        description: serverMessage ?? "Peça acesso a um administrador.",
      };
    case 404:
      return {
        kind: "not-found",
        title: "Não encontrado",
        description: serverMessage ?? "O item pode ter sido removido.",
      };
    case 409:
      return {
        kind: "conflict",
        title: "Não foi possível concluir",
        description: serverMessage,
      };
    case 429:
      return {
        kind: "rate-limit",
        title: "Muitas tentativas",
        description: "Aguarde um instante e tente de novo.",
      };
    default:
      return {
        kind: "unknown",
        title: serverMessage ?? "Não foi possível concluir",
        description: serverMessage
          ? undefined
          : "Tente de novo. Se continuar, avise o suporte.",
      };
  }
}
