import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Standardize AuthN/AuthZ error bodies for security clients and OpenAPI consumers.
 */
@Catch(UnauthorizedException, ForbiddenException)
export class SecurityExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus?.() ?? HttpStatus.UNAUTHORIZED;
    const raw = exception.getResponse();
    const body =
      typeof raw === 'string'
        ? { statusCode: status, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: raw }
        : {
            statusCode: status,
            code:
              (raw as { code?: string }).code ??
              (status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'),
            message: (raw as { message?: string | string[] }).message ?? exception.message,
            permission: (raw as { permission?: string }).permission,
          };
    res.status(status).json(body);
  }
}
