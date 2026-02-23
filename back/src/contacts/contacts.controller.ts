import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ContactsService } from './contacts.service';

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
}
