import { NextRequest } from 'next/server';

/**
 * Rota que apenas confirma o recebimento da atualização.
 * A atualização real é enviada via WebSocket diretamente do frontend para a página de painel.
 * Esta rota não faz chamadas ao backend/RD Station.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;
    
    console.log('🔄 [API ROUTE] Recebendo requisição PUT /api/deals/[id]/set-now');
    console.log('🔄 [API ROUTE] Deal ID da URL:', dealId);
    console.log('🔄 [API ROUTE] Tipo do Deal ID:', typeof dealId);

    if (!dealId || dealId.trim() === '') {
      return Response.json(
        { errors: [{ detail: 'ID da deal é obrigatório na URL' }] },
        { status: 400 }
      );
    }

    let owner_id: string | undefined;
    try {
      const body = await request.json();
      owner_id = body.owner_id;
      console.log('🔄 [API ROUTE] Owner ID do body:', owner_id);
    } catch (error) {
      console.warn('⚠️ [API ROUTE] Body não pôde ser parseado, continuando sem owner_id');
    }

    // Esta rota apenas confirma o recebimento
    // A atualização real é enviada via WebSocket do frontend para a página de painel
    console.log('✅ [API ROUTE] Requisição recebida. Atualização será enviada via WebSocket pelo frontend.');
    console.log('✅ [API ROUTE] Deal ID confirmado:', dealId);

    return Response.json({
      success: true,
      message: 'Atualização recebida. Será enviada via WebSocket para a página de painel.',
      deal_id: dealId, // ID da deal que foi marcada como "now"
      owner_id: owner_id,
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔄 [API ROUTE] ❌ ERRO GERAL:', error);
    
    return Response.json(
      { errors: [{ detail: error?.message || 'Erro ao processar requisição' }] },
      { status: 500 }
    );
  }
}
