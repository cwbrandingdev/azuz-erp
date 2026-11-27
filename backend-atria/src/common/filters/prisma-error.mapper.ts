import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface MappedError {
  status: number;
  code: string;
  message: string;
}

const COLUMN_LABELS: Record<string, string> = {
  email: 'e-mail',
  cnpj: 'CNPJ',
  name: 'nome',
  phone: 'telefone',
  slug: 'identificador',
};

const DATABASE_UNAVAILABLE: MappedError = {
  status: HttpStatus.SERVICE_UNAVAILABLE,
  code: 'DATABASE_UNAVAILABLE',
  message:
    'Não foi possível conectar ao banco de dados. Tente de novo em instantes.',
};

function describeDuplicate(target: unknown): string {
  const columns = Array.isArray(target) ? target.map(String) : [];
  if (columns.length === 0) return 'Já existe um registro com esses dados.';

  const labels = columns.map((column) => COLUMN_LABELS[column] ?? column);
  return labels.length === 1
    ? `Já existe um registro com este valor de ${labels[0]}.`
    : `Já existe um registro com essa combinação: ${labels.join(' + ')}.`;
}

function looksLikeConnectionFailure(message: string): boolean {
  return /can't reach database|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|tenant\/user/i.test(
    message,
  );
}

export function mapPrismaError(exception: unknown): MappedError | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_VALUE',
          message: describeDuplicate(exception.meta?.target),
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          code: 'LINKED_RECORDS',
          message:
            'Esta operação não é possível porque o registro está ligado a outros dados. Remova ou altere os vínculos e tente de novo.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message:
            'Registro não encontrado. Ele pode ter sido removido por outra pessoa.',
        };
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'VALUE_TOO_LONG',
          message: 'Um dos textos informados é longo demais.',
        };
      case 'P2011':
      case 'P2012':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'MISSING_VALUE',
          message: 'Falta preencher um campo obrigatório.',
        };
      case 'P2021':
      case 'P2022':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_OUTDATED',
          message:
            'O banco de dados está desatualizado em relação ao sistema. Avise o suporte.',
        };
      case 'P1001':
      case 'P1002':
      case 'P1008':
      case 'P1017':
        return DATABASE_UNAVAILABLE;
      default:
        return null;
    }
  }

  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return DATABASE_UNAVAILABLE;
  }

  if (
    exception instanceof Prisma.PrismaClientUnknownRequestError &&
    looksLikeConnectionFailure(exception.message)
  ) {
    return DATABASE_UNAVAILABLE;
  }

  return null;
}
