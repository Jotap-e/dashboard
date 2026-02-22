import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DealsService } from './deals/deals.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dealsService: DealsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Backend está funcionando corretamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test-deals')
  async testDeals() {
    try {
      console.log('🧪 [TEST] Testando rota de deals...');
      const result = await this.dealsService.getAllDeals(1, 5);
      return {
        success: true,
        message: 'Rota de deals funcionando!',
        data: {
          totalDeals: result.data?.length || 0,
          hasLinks: !!result.links,
          firstDeal: result.data?.[0] || null,
        },
        fullResponse: result,
      };
    } catch (error: any) {
      console.error('❌ [TEST] Erro ao testar deals:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
