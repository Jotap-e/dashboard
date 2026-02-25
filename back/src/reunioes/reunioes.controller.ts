import { Controller, Get, Post, Body, Query, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { DatabaseOperationsService } from '../database/database-operations.service';
import { DealsService } from '../deals/deals.service';
import { ContactsService } from '../contacts/contacts.service';
import { DealsGateway } from '../websocket/deals.gateway';

export class CreateReuniaoDto {
  vendedorId: string;
  vendedorNome?: string; // Opcional: resolvido a partir do vendedorId
  data?: string; // YYYY-MM-DD, default: hoje
  clienteNome: string; // Nome do cliente (form manual) ou deal.name (fluxo now)
  clienteNumero?: string; // Telefone do cliente (preenchido no form)
  valor?: number; // Valor/preço da call (opcional)
}

@Controller('reunioes')
export class ReunioesController {
  constructor(
    private readonly databaseOperationsService: DatabaseOperationsService,
    private readonly dealsService: DealsService,
    private readonly contactsService: ContactsService,
    @Inject(forwardRef(() => DealsGateway))
    private readonly dealsGateway: DealsGateway,
  ) {}

  /**
   * GET /reunioes?data=YYYY-MM-DD (default: hoje)
   * GET /reunioes?vendedorId=xxx&data=YYYY-MM-DD
   * Filtra por data de criação (createdAt) coincidindo com o dia informado.
   * Total de reuniões = data.length (ou count) do response.
   */
  @Get()
  async getReunioes(
    @Query('data') data?: string,
    @Query('vendedorId') vendedorId?: string,
  ) {
    try {
      const dataFiltro = data ?? new Date().toISOString().split('T')[0];

      const reunioes = vendedorId
        ? await this.databaseOperationsService.getReunioesByVendedorAndDate(
            vendedorId,
            dataFiltro,
          )
        : await this.databaseOperationsService.getReunioesByDate(dataFiltro);

      // Enriquecer reuniões com telefones dos contatos
      const reunioesEnriquecidas = await Promise.all(
        reunioes.map(async (reuniao) => {
          // Se já tem clienteNumero, manter
          if (reuniao.clienteNumero) {
            return reuniao;
          }

          // Se negociacaoId é 'manual', não buscar contato
          if (reuniao.negociacaoId === 'manual' || !reuniao.negociacaoId) {
            return reuniao;
          }

          try {
            // Buscar deal para pegar contact_ids
            const deal = await this.dealsService.getDealById(reuniao.negociacaoId);
            
            // Pegar o primeiro contact_id
            if (deal.contact_ids && deal.contact_ids.length > 0) {
              const contactId = deal.contact_ids[0];
              
              // Buscar contato
              const contact = await this.contactsService.getContactById(contactId);
              
              // Extrair telefone
              const telefone = this.contactsService.extractPhone(contact);
              
              if (telefone) {
                return {
                  ...reuniao,
                  clienteNumero: telefone,
                };
              }
            }
          } catch (error) {
            // Se houver erro ao buscar contato, manter reunião sem telefone
            console.warn(`⚠️ Erro ao buscar telefone para reunião ${reuniao.negociacaoId}:`, error);
          }

          return reuniao;
        })
      );

      return {
        success: true,
        data: reunioesEnriquecidas,
        count: reunioesEnriquecidas.length,
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao buscar reuniões',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createReuniao(@Body() dto: CreateReuniaoDto) {
    try {
      if (!dto.vendedorId || !dto.clienteNome?.trim()) {
        throw new HttpException(
          { success: false, message: 'vendedorId e clienteNome são obrigatórios' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = dto.data ?? new Date().toISOString().split('T')[0];
      const vendedorNome = this.databaseOperationsService.getVendedorNomeById(dto.vendedorId);

      const reuniao = await this.databaseOperationsService.createReuniaoManual(
        dto.vendedorId,
        vendedorNome,
        data,
        dto.clienteNome.trim(),
        dto.clienteNumero?.trim() || undefined,
      );

      if (!reuniao) {
        throw new HttpException(
          { success: false, message: 'Não foi possível criar a reunião' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Criar deal "fake" no estado WebSocket e marcar como "now"
      const dealId = `manual_${reuniao._id || Date.now()}`;
      const dealNowUpdate = {
        deal_id: dealId,
        is_now: true,
        updated_at: new Date().toISOString(),
        owner_id: dto.vendedorId,
        vendedor_nome: vendedorNome,
        cliente_nome: dto.clienteNome.trim(),
        cliente_numero: dto.clienteNumero?.trim() || undefined,
        valor: dto.valor && dto.valor > 0 ? dto.valor : undefined,
      };

      // Emitir evento WebSocket para atualizar o frontend
      this.dealsGateway.handleDealNowUpdate(dealNowUpdate);

      return {
        success: true,
        data: {
          ...reuniao,
          dealId, // Retornar o ID da deal fake para o frontend
        },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao criar reunião',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
