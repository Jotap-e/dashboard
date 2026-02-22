import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: Array<{ detail: string }> = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errors = [{ detail: exceptionResponse }];
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errors = responseObj.errors || [{ detail: message }];
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errors = [{ detail: exception.message }];
    }

    // Log do erro para debug
    console.error('❌ Erro capturado pelo filtro global:', {
      status,
      message,
      path: request.url,
      method: request.method,
      error: exception instanceof Error ? exception.stack : exception,
    });

    // Sempre retornar JSON, nunca HTML
    response.status(status).json({
      errors,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
