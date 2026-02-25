import { Controller, Get, Put, Param, Body, HttpException, HttpStatus, Query } from '@nestjs/common';
import { DealsService, DealResponse, Deal } from './deals.service';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  async getDeals(
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('owner_id') ownerId?: string,
    @Query('pipeline_id') pipelineId?: string,
    @Query('stage_id') stageId?: string,
  ): Promise<DealResponse> {
    try {
      // Log dos parâmetros recebidos
      console.log('📥 Parâmetros recebidos:', { page, size, ownerId, pipelineId, stageId });
      
      // Validar e converter parâmetros de paginação
      let pageNumber = 1;
      let pageSize = 25;

      if (page) {
        const parsedPage = parseInt(page, 10);
        if (!isNaN(parsedPage) && parsedPage > 0) {
          pageNumber = parsedPage;
        } else {
          console.warn(`⚠️ Valor inválido para 'page': ${page}, usando padrão: 1`);
        }
      }

      if (size) {
        const parsedSize = parseInt(size, 10);
        if (!isNaN(parsedSize) && parsedSize > 0 && parsedSize <= 100) {
          pageSize = parsedSize;
        } else {
          console.warn(`⚠️ Valor inválido para 'size': ${size}, usando padrão: 25`);
        }
      }

      // Validar owner_id se fornecido
      if (ownerId) {
        ownerId = ownerId.trim();
        if (ownerId === '') {
          ownerId = undefined;
        } else if (ownerId.length < 10) {
          // Validação básica: owner_id deve ter pelo menos 10 caracteres
          console.warn(`⚠️ owner_id parece inválido (muito curto): ${ownerId}`);
        }
      }
      
      // Validar pipeline_id se fornecido
      let cleanPipelineId: string | undefined = undefined;
      if (pipelineId) {
        cleanPipelineId = pipelineId.trim();
        if (cleanPipelineId === '') {
          cleanPipelineId = undefined;
        }
      }
      
      // Validar stage_id se fornecido
      let cleanStageId: string | undefined = undefined;
      if (stageId) {
        cleanStageId = stageId.trim();
        if (cleanStageId === '') {
          cleanStageId = undefined;
        }
      }
      
      console.log('✅ Parâmetros processados:', { pageNumber, pageSize, ownerId: ownerId || 'todos', pipelineId: cleanPipelineId || 'nenhum', stageId: cleanStageId || 'nenhum' });
      
      // Se owner_id for fornecido, buscar deals do vendedor específico
      // Caso contrário, buscar todos os deals
      if (!ownerId) {
        console.log('📋 Buscando todos os deals (sem filtro de owner)');
        const deals = await this.dealsService.getAllDeals(pageNumber, pageSize);
        console.log('✅ Deals retornados:', { total: deals.data?.length || 0 });
        return deals;
      } else {
        console.log(`👤 Buscando deals do owner_id: ${ownerId}${cleanPipelineId ? ` (pipeline: ${cleanPipelineId})` : ''}${cleanStageId ? ` (stage: ${cleanStageId})` : ''}`);
        // Garantir que quando owner_id é fornecido, o stage_id também seja aplicado se fornecido
        // Os filtros aplicados serão: owner_id e stage_id (se fornecido)
        const deals = await this.dealsService.getDealsByOwner(ownerId, pageNumber, pageSize, cleanPipelineId, cleanStageId);
        console.log('✅ Deals retornados:', { total: deals.data?.length || 0 });
        console.log('🔍 Filtros aplicados:', { owner_id: ownerId, stage_id: cleanStageId || 'não fornecido', pipeline_id: cleanPipelineId || 'não fornecido' });
        return deals;
      }
    } catch (error: any) {
      // Log detalhado do erro para debug
      console.error('❌ Erro ao buscar deals:', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error: error,
      });
      
      // Se o erro já tem statusCode (erro da API RD Station), repassar
      if (error?.statusCode) {
        const statusCode = error.statusCode;
        const errorMessage = error.message || 'Erro ao buscar negociações';
        const errors = error.errors || [{ detail: errorMessage }];
        
        console.error(`❌ Erro da API (${statusCode}):`, errors);
        
        throw new HttpException(
          { errors },
          statusCode,
        );
      }
      
      // Erro interno do servidor
      const errorMessage = error?.message || 'Erro interno ao processar requisição';
      console.error('❌ Erro interno:', errorMessage);
      
      throw new HttpException(
        {
          errors: [
            {
              detail: errorMessage,
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Busca apenas os IDs dos deals com flag "now" = true
   * Retorna array de IDs para verificação rápida
   */
  @Get('now/ids')
  async getDealIdsWithNow(): Promise<{ data: string[] }> {
    try {
      console.log('📋 Buscando IDs de deals com flag "now" = true');
      const dealIds = await this.dealsService.getDealIdsWithNow();
      console.log('✅ IDs de deals com flag "now" retornados:', { total: dealIds.length });
      return { data: dealIds };
    } catch (error: any) {
      console.error('❌ Erro ao buscar IDs de deals com flag "now":', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error: error,
      });
      
      if (error?.statusCode) {
        throw new HttpException(
          { errors: error.errors || [{ detail: error.message }] },
          error.statusCode,
        );
      }
      
      throw new HttpException(
        {
          errors: [
            {
              detail: error?.message || 'Erro interno ao buscar IDs de deals com flag "now"',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Busca negociações (deals) com flag "now" = true
   * Retorna deals que estão marcados como "em andamento agora"
   */
  @Get('now')
  async getDealsWithNow(): Promise<DealResponse> {
    try {
      console.log('📋 Buscando deals com flag "now" = true');
      const deals = await this.dealsService.getDealsWithNow();
      console.log('✅ Deals com flag "now" retornados:', { total: deals.data?.length || 0 });
      return deals;
    } catch (error: any) {
      console.error('❌ Erro ao buscar deals com flag "now":', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error: error,
      });
      
      if (error?.statusCode) {
        throw new HttpException(
          { errors: error.errors || [{ detail: error.message }] },
          error.statusCode,
        );
      }
      
      throw new HttpException(
        {
          errors: [
            {
              detail: error?.message || 'Erro interno ao buscar deals com flag "now"',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Define um deal como "now" (em andamento agora)
   * Desativa o "now" de todos os deals do mesmo owner e ativa no deal especificado
   */
  @Put(':id/set-now')
  async setDealAsNow(
    @Param('id') dealId: string,
    @Body() body: { owner_id: string },
  ): Promise<{ data: Deal; message: string }> {
    try {
      const { owner_id: ownerId } = body;
      
      console.log('🔄 Definindo deal como "now":', { dealId, ownerId });
      
      if (!ownerId || typeof ownerId !== 'string' || ownerId.trim() === '') {
        throw new HttpException(
          {
            errors: [{ detail: 'owner_id é obrigatório no body da requisição' }],
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedDeal = await this.dealsService.setDealAsNow(dealId, ownerId);
      
      console.log('✅ Deal marcado como "now" com sucesso:', { dealId });
      
      return {
        data: updatedDeal,
        message: 'Deal marcado como "em andamento agora" com sucesso',
      };
    } catch (error: any) {
      console.error('❌ Erro ao definir deal como "now":', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error: error,
      });
      
      if (error?.statusCode) {
        throw new HttpException(
          { errors: error.errors || [{ detail: error.message }] },
          error.statusCode,
        );
      }
      
      throw new HttpException(
        {
          errors: [
            {
              detail: error?.message || 'Erro interno ao definir deal como "now"',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Atualiza o status de uma negociação (deal) no RD Station
   */
  @Put(':id')
  async updateDealStatus(
    @Param('id') dealId: string,
    @Body() updateData: Partial<Deal>,
  ): Promise<{ data: Deal; message: string }> {
    try {
      console.log('🔄 Atualizando deal:', { dealId, updateData });
      
      if (!dealId || typeof dealId !== 'string' || dealId.trim() === '') {
        throw new HttpException(
          {
            errors: [{ detail: 'deal_id é obrigatório e deve ser uma string válida' }],
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedDeal = await this.dealsService.updateDealStatus(dealId, updateData);
      
      console.log('✅ Deal atualizado com sucesso:', { dealId });
      
      return {
        data: updatedDeal,
        message: 'Deal atualizado com sucesso',
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar deal:', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error: error,
      });
      
      if (error?.statusCode) {
        throw new HttpException(
          { errors: error.errors || [{ detail: error.message }] },
          error.statusCode,
        );
      }
      
      throw new HttpException(
        {
          errors: [
            {
              detail: error?.message || 'Erro interno ao atualizar deal',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Busca uma negociação (deal) específica pelo ID
   */
  @Get(':id')
  async getDealById(@Param('id') dealId: string): Promise<{ data: Deal }> {
    try {
      console.log('📋 Buscando deal com ID:', dealId);
      const deal = await this.dealsService.getDealById(dealId);
      console.log('✅ Deal encontrado:', { id: deal.id, name: deal.name });
      return { data: deal };
    } catch (error: any) {
      console.error('❌ Erro ao buscar deal:', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error: error,
      });
      
      if (error?.statusCode) {
        throw new HttpException(
          { errors: error.errors || [{ detail: error.message }] },
          error.statusCode,
        );
      }
      
      throw new HttpException(
        {
          errors: [
            {
              detail: error?.message || 'Erro interno ao buscar deal',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Busca agendamentos de SDRs do dia atual
   * Retorna contagem de reuniões por SDR (Rafael Ratão e Gabriel)
   */
  @Get('sdr/agendamentos')
  async getSdrAgendamentos(): Promise<{ rafaelRatao: number; gabriel: number }> {
    try {
      console.log('📅 Buscando agendamentos de SDRs para hoje');
      const agendamentos = await this.dealsService.getSdrAgendamentosHoje();
      console.log(`✅ Agendamentos contabilizados - Rafael Ratão: ${agendamentos.rafaelRatao}, Gabriel: ${agendamentos.gabriel}`);
      return agendamentos;
    } catch (error: any) {
      console.error('❌ Erro ao buscar agendamentos de SDRs:', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error,
      });
      
      if (error?.statusCode) {
        throw new HttpException(
          { errors: error.errors || [{ detail: error.message }] },
          error.statusCode,
        );
      }
      
      throw new HttpException(
        {
          errors: [
            {
              detail: error?.message || 'Erro interno ao buscar agendamentos de SDRs',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
