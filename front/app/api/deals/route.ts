import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extrair query parameters da URL
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');
    const page = searchParams.get('page') || '1';
    const size = searchParams.get('size') || '25';

    console.log('🔄 [API ROUTE] ============================================');
    console.log('🔄 [API ROUTE] Recebendo requisição /api/deals');
    console.log('🔄 [API ROUTE] Query params:', { owner_id: ownerId, page, size });
    console.log('🔄 [API ROUTE] Request URL:', request.url);

    // Construir URL do backend - usar 127.0.0.1 para evitar problemas de DNS com localhost
    const backendHost = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    const backendUrl = new URL(`${backendHost}/api/deals`);
    if (ownerId) {
      backendUrl.searchParams.append('owner_id', ownerId);
    }
    backendUrl.searchParams.append('page', page);
    backendUrl.searchParams.append('size', size);

    console.log('🔄 [API ROUTE] Fazendo proxy para:', backendUrl.toString());
    console.log('🔄 [API ROUTE] Backend Host:', backendHost);
    console.log('🔄 [API ROUTE] Timestamp:', new Date().toISOString());

    // Fazer requisição para o backend com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

    try {
      const response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
        // Adicionar cache: 'no-store' para evitar problemas em desenvolvimento
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      console.log('🔄 [API ROUTE] Status da resposta do backend:', response.status);
      console.log('🔄 [API ROUTE] Status OK?', response.ok);

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      console.log('🔄 [API ROUTE] Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('🔄 [API ROUTE] ❌ Backend não retornou JSON');
        console.error('🔄 [API ROUTE] Content-Type recebido:', contentType);
        console.error('🔄 [API ROUTE] Primeiros 200 caracteres:', text.substring(0, 200));
        return Response.json(
          { 
            errors: [{ detail: 'Backend não retornou JSON válido' }] 
          },
          { status: 500 }
        );
      }

      const data = await response.json();
      console.log('🔄 [API ROUTE] Dados recebidos do backend:', { 
        totalDeals: data.data?.length || 0,
        hasNext: !!data.links?.next,
        hasErrors: !!data.errors 
      });
      console.log('🔄 [API ROUTE] ============================================');

      // Retornar a resposta do backend
      return Response.json(data, { status: response.status });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Erro específico de timeout
      if (fetchError.name === 'AbortError') {
        console.error('🔄 [API ROUTE] ❌ Timeout ao conectar com backend (30s)');
        return Response.json(
          { 
            errors: [{ 
              detail: 'Timeout ao conectar com o backend. Verifique se o backend está rodando.' 
            }] 
          },
          { status: 504 }
        );
      }
      
      console.error('🔄 [API ROUTE] ❌ Erro ao fazer fetch para backend');
      console.error('🔄 [API ROUTE] Tipo:', fetchError?.constructor?.name);
      console.error('🔄 [API ROUTE] Mensagem:', fetchError?.message);
      console.error('🔄 [API ROUTE] Código:', fetchError?.code);
      console.error('🔄 [API ROUTE] Stack:', fetchError?.stack);
      
      // Verificar se é erro de conexão
      if (fetchError?.message?.includes('fetch failed') || fetchError?.code === 'ECONNREFUSED') {
        return Response.json(
          { 
            errors: [{ 
              detail: `Não foi possível conectar ao backend em ${backendHost}. Verifique se está rodando.` 
            }] 
          },
          { status: 503 }
        );
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('🔄 [API ROUTE] ============================================');
    console.error('🔄 [API ROUTE] ❌ ERRO GERAL');
    console.error('🔄 [API ROUTE] Tipo:', error?.constructor?.name);
    console.error('🔄 [API ROUTE] Mensagem:', error?.message);
    console.error('🔄 [API ROUTE] Stack:', error?.stack);
    console.error('🔄 [API ROUTE] ============================================');
    
    return Response.json(
      { 
        errors: [{ 
          detail: error?.message || 'Erro ao conectar com o backend. Verifique se está rodando em localhost:3001' 
        }] 
      },
      { status: 500 }
    );
  }
}
