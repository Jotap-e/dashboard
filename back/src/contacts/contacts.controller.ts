import { Controller, Get, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ContactsService, Contact } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get(':id')
  async getContact(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new HttpException(
          {
            success: false,
            message: 'ID do contato é obrigatório',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const contact = await this.contactsService.getContactById(id);

      return {
        success: true,
        data: contact,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('não encontrado')) {
        throw new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      if (errorMessage.includes('Token de acesso')) {
        throw new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      
      if (errorMessage.includes('permissão')) {
        throw new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.FORBIDDEN,
        );
      }
      
      if (errorMessage.includes('Limite de requisições')) {
        throw new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: 'Erro ao buscar contato',
          error: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateContact(
    @Param('id') contactId: string,
    @Body() updateData: Partial<Contact>,
  ): Promise<{ success: true; data: Contact; message: string }> {
    try {
      console.log('🔄 Atualizando contato:', { contactId, updateData });
      
      if (!contactId || typeof contactId !== 'string' || contactId.trim() === '') {
        throw new HttpException(
          {
            success: false,
            message: 'contact_id é obrigatório e deve ser uma string válida',
            errors: [{ detail: 'contact_id é obrigatório e deve ser uma string válida' }],
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedContact = await this.contactsService.updateContact(contactId, updateData);
      
      console.log('✅ Contato atualizado com sucesso:', { contactId });
      
      return {
        success: true,
        data: updatedContact,
        message: 'Contato atualizado com sucesso',
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar contato:', {
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
        error: error,
      });
      
      if (error?.statusCode) {
        throw new HttpException(
          { 
            success: false,
            errors: error.errors || [{ detail: error.message }] 
          },
          error.statusCode,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Erro interno ao atualizar contato',
          errors: [
            {
              detail: error?.message || 'Erro interno ao atualizar contato',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
