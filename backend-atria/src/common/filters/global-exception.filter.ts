import { randomBytes } from 'crypto';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { mapPrismaError } from './prisma-error.mapper';

const SERVER_ERROR_MESSAGE =
  'Algo deu errado no servidor. Tente de novo; se continuar, informe o código de referência ao suporte.';
const VALIDATION_MESSAGE = 'Alguns campos estão incorretos.';
const TOO_MANY_REQUESTS_MESSAGE =
  'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.';

// Textos que o próprio Nest gera quando ninguém escreveu uma mensagem.
const FORBIDDEN_MESSAGE = {
  message: 'Você não tem permissão para fazer isso.',
  code: 'FORBIDDEN',
};

const DEFAULT_MESSAGES: Record<string, { message: string; code: string }> = {
  'Forbidden resource': FORBIDDEN_MESSAGE,
  Forbidden: FORBIDDEN_MESSAGE,
  'Internal Server Error': {
    message: SERVER_ERROR_MESSAGE,
    code: 'INTERNAL_ERROR',
  },
  Unauthorized: {
    message: 'Sua sessão expirou. Entre novamente.',
    code: 'UNAUTHORIZED',
  },
  'Not Found': { message: 'Recurso não encontrado.', code: 'NOT_FOUND' },
  'Bad Gateway': {
    message: 'Um serviço externo não respondeu. Tente de novo em instantes.',
    code: 'BAD_GATEWAY',
  },
  'Service Unavailable': {
    message: 'Serviço indisponível no momento. Tente de novo em instantes.',
    code: 'SERVICE_UNAVAILABLE',
  },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = SERVER_ERROR_MESSAGE;
    let errors: string[] | undefined;
    let code: string | undefined = 'INTERNAL_ERROR';

    const databaseError = mapPrismaError(exception);

    if (databaseError) {
      ({ status, message, code } = databaseError);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = undefined;
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string) ?? message;

        if (Array.isArray(body.message)) {
          errors = body.message as string[];
          message = VALIDATION_MESSAGE;
          code = 'VALIDATION_ERROR';
        }

        if (typeof body.code === 'string') {
          code = body.code;
        }
      }

      const known = DEFAULT_MESSAGES[message];
      if (known) {
        message = known.message;
        code ??= known.code;
      }

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        message = TOO_MANY_REQUESTS_MESSAGE;
        code = 'TOO_MANY_REQUESTS';
      }
    }

    // Só erros do servidor recebem referência: o usuário informa o código e o
    // mesmo código aparece no log, ao lado do motivo real.
    const reference = status >= 500 ? this.newReference() : undefined;
    if (reference) this.logServerError(reference, request, status, exception);

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      ...(code ? { code } : {}),
      ...(reference ? { reference } : {}),
      timestamp: new Date().toISOString(),
    });
  }

  private newReference(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private logServerError(
    reference: string,
    request: Request,
    status: number,
    exception: unknown,
  ) {
    const detail =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `[${reference}] ${request.method} ${request.originalUrl} → ${status}: ${detail}`,
      stack,
    );
  }
}
