import { Controller, Post } from '@nestjs/common';
import { RdTokenService } from './rd-token.service';

@Controller('rd-token')
export class RdTokenController {
  constructor(private readonly rdTokenService: RdTokenService) {}

  @Post('refresh')
  async refreshToken() {
    await this.rdTokenService.refreshToken();
    return {
      message: 'Refresh token executado com sucesso',
      timestamp: new Date().toISOString(),
    };
  }
}
