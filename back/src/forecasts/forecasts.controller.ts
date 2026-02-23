import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseOperationsService } from '../database/database-operations.service';

export interface CreateForecastDto {
  id: string;
  vendedorId: string;
  clienteNome: string;
  clienteNumero: string;
  data: string;
  horario: string;
  valor: number;
  observacoes: string;
  primeiraCall: string;
  negociacaoId?: string;
  createdAt: string;
  updatedAt: string;
  /** Data de criação do forecast (YYYY-MM-DD) - enviada pelo frontend */
  dataCriacao?: string;
  /** Hora de criação do forecast (HH:mm ou HH:mm:ss) - enviada pelo frontend */
  horaCriacao?: string;
  /** Nome do closer que criou o forecast */
  closerNome?: string;
}

@Controller('forecasts')
export class ForecastsController {
  constructor(private readonly databaseOperationsService: DatabaseOperationsService) {}

  @Get('dia')
  async getForecastsDoDia(@Query('data') data?: string) {
    try {
      const dataFiltro = data ?? new Date().toISOString().split('T')[0];
      const forecasts = await this.databaseOperationsService.getForecastsByDate(
        dataFiltro,
      );

      return {
        success: true,
        data: forecasts,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao buscar forecasts do dia',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getForecasts(
    @Query('closerNome') closerNome: string,
    @Query('dataCriacao') dataCriacao?: string,
  ) {
    try {
      if (!closerNome) {
        throw new HttpException(
          {
            success: false,
            message: 'closerNome é obrigatório',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const forecasts = await this.databaseOperationsService.getForecasts(
        closerNome,
        dataCriacao,
      );

      return {
        success: true,
        data: forecasts,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao buscar forecasts',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createForecast(@Body() body: CreateForecastDto) {
    try {
      const now = new Date();
      const dataCriacao = body.dataCriacao ?? now.toISOString().split('T')[0]; // YYYY-MM-DD
      const horaCriacao = body.horaCriacao ?? now.toTimeString().slice(0, 8); // HH:mm:ss
      const closerNome = body.closerNome ?? '';

      const saved = await this.databaseOperationsService.saveForecast({
        ...body,
        dataCriacao,
        horaCriacao,
        closerNome,
      });

      if (!saved) {
        throw new HttpException(
          {
            success: false,
            message: 'Banco de dados não está conectado. Tente novamente em alguns segundos.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return {
        success: true,
        message: 'Forecast salvo no banco com sucesso',
        data: {
          id: body.id,
          dataCriacao,
          horaCriacao,
          closerNome,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao salvar forecast no banco',
          error: error?.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateForecast(@Param('id') id: string, @Body() body: CreateForecastDto) {
    try {
      if (body.id && body.id !== id) {
        throw new HttpException(
          { success: false, message: 'ID do body não corresponde ao ID da URL' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const payload = { ...body, id };
      const dataCriacao = body.dataCriacao ?? body.createdAt?.split('T')[0];
      const horaCriacao = body.horaCriacao ?? body.createdAt?.split('T')[1]?.slice(0, 8) ?? new Date().toTimeString().slice(0, 8);
      const closerNome = body.closerNome ?? '';

      const saved = await this.databaseOperationsService.saveForecast({
        ...payload,
        dataCriacao: dataCriacao ?? new Date().toISOString().split('T')[0],
        horaCriacao,
        closerNome,
      });

      if (!saved) {
        throw new HttpException(
          {
            success: false,
            message: 'Banco de dados não está conectado. Tente novamente em alguns segundos.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return {
        success: true,
        message: 'Forecast atualizado com sucesso',
        data: { id },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao atualizar forecast',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteForecast(@Param('id') id: string) {
    try {
      const deleted = await this.databaseOperationsService.deleteForecast(id);

      if (!deleted) {
        throw new HttpException(
          {
            success: false,
            message: 'Banco de dados não está conectado. Tente novamente em alguns segundos.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return {
        success: true,
        message: 'Forecast removido com sucesso',
        data: { id },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao remover forecast',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
