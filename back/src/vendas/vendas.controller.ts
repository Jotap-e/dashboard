import { Controller, Get, Post, Delete, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseOperationsService } from '../database/database-operations.service';

export interface CreateVendaDto {
  vendedorId: string;
  vendedorNome: string;
  negociacaoId: string;
  valorNegociacao: number;
  clienteNumero?: string; // Telefone do cliente associado à deal
}

@Controller('vendas')
export class VendasController {
  constructor(private readonly databaseOperationsService: DatabaseOperationsService) {}

  @Get()
  async getVendas(
    @Query('data') data?: string,
    @Query('vendedorId') vendedorId?: string,
  ) {
    try {
      const dataFiltro = data ?? new Date().toISOString().split('T')[0];
      const vendas = await this.databaseOperationsService.getVendas(dataFiltro, vendedorId);
      const valorTime = vendas.reduce((sum, v) => sum + v.valorNegociacao, 0);
      return {
        success: true,
        data: vendas,
        valorTime,
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao buscar vendas',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createVenda(@Body() body: CreateVendaDto) {
    try {
      if (!body.vendedorId || !body.vendedorNome || !body.negociacaoId || body.valorNegociacao == null) {
        throw new HttpException(
          {
            success: false,
            message: 'Dados obrigatórios faltando: vendedorId, vendedorNome, negociacaoId, valorNegociacao',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (body.valorNegociacao <= 0) {
        throw new HttpException(
          {
            success: false,
            message: 'valorNegociacao deve ser maior que zero',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const saved = await this.databaseOperationsService.saveVenda(
        body.vendedorId,
        body.vendedorNome,
        body.negociacaoId,
        body.valorNegociacao,
        body.clienteNumero,
      );

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
        message: 'Venda salva no banco com sucesso',
        data: {
          vendedorNome: body.vendedorNome,
          valorNegociacao: body.valorNegociacao,
        },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao salvar venda no banco',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete()
  async deleteVenda(
    @Query('negociacaoId') negociacaoId: string,
    @Query('vendedorId') vendedorId: string,
    @Query('data') data?: string,
  ) {
    try {
      if (!negociacaoId || !vendedorId) {
        throw new HttpException(
          {
            success: false,
            message: 'Dados obrigatórios faltando: negociacaoId, vendedorId',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const deleted = await this.databaseOperationsService.deleteVenda(
        negociacaoId,
        vendedorId,
        data,
      );

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
        message: 'Venda revertida com sucesso',
        data: { negociacaoId, vendedorId },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao reverter venda',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
