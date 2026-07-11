import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = request;
    const startedAt = Date.now();

    this.logger.log(`[REQUEST] ${method} ${originalUrl}`);

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode ?? 200;
        const elapsedMs = Date.now() - startedAt;
        this.logger.log(
          `[RESPONSE] ${method} ${originalUrl} -> ${statusCode} (${elapsedMs}ms)`,
        );
      }),
      catchError((error) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const statusCode = response.statusCode ?? error.status ?? 500;
        const elapsedMs = Date.now() - startedAt;
        this.logger.error(
          `[RESPONSE_ERROR] ${method} ${originalUrl} -> ${statusCode} (${elapsedMs}ms)`,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          error?.stack,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return throwError(() => error);
      }),
    );
  }
}
