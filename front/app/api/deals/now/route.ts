import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [API ROUTE] Recebendo requisição /api/deals/now');

    // Construir URL do backend - padrão: localhost:3002
    const backendHost = process.env.BACKEND_URL || 'http://localhost:3002';
    const backendUrl = `${backendHost}/api/deals/now`;

    console.log('🔄 [API ROUTE] Fazendo proxy para:', backendUrl);

    // Fazer requisição para o backend com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      console.log('🔄 [API ROUTE] Status da resposta do backend:', response.status);

      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('🔄 [API ROUTE] ❌ Backend não retornou JSON');
        return Response.json(
          { errors: [{ detail: 'Backend não retornou JSON válido' }] },
          { status: 500 }
        );
      }

      const data = await response.json();
      console.log('🔄 [API ROUTE] Dados recebidos:', { 
        totalDeals: data.data?.length || 0 
      });

      return Response.json(data, { status: response.status });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return Response.json(
          { errors: [{ detail: 'Timeout ao conectar com o backend' }] },
          { status: 504 }
        );
      }
      
      if (fetchError?.message?.includes('fetch failed') || fetchError?.code === 'ECONNREFUSED') {
        return Response.json(
          { errors: [{ detail: `Não foi possível conectar ao backend em ${backendHost}` }] },
          { status: 503 }
        );
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('🔄 [API ROUTE] ❌ ERRO GERAL:', error);
    
    return Response.json(
      { errors: [{ detail: error?.message || 'Erro ao conectar com o backend' }] },
      { status: 500 }
    );
  }
}
