import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📅 [API ROUTE] Recebendo requisição /api/deals/sdr/agendamentos');

    // Construir URL do backend - padrão: localhost:3002
    const backendHost = process.env.BACKEND_URL || 'http://localhost:3002';
    
    // Garantir que backendHost não termine com /api para evitar duplicação
    const baseUrl = backendHost.endsWith('/api') 
      ? backendHost.replace(/\/api$/, '') 
      : backendHost;
    
    const backendUrl = new URL(`${baseUrl}/api/deals/sdr/agendamentos`);

    console.log('📅 [API ROUTE] Backend Host:', backendHost);
    console.log('📅 [API ROUTE] Base URL:', baseUrl);
    console.log('📅 [API ROUTE] Fazendo proxy para:', backendUrl.toString());

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
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      console.log('📅 [API ROUTE] Status da resposta do backend:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: [{ detail: 'Erro desconhecido' }] }));
        console.error('📅 [API ROUTE] Erro do backend:', errorData);
        return Response.json(errorData, { status: response.status });
      }

      const data = await response.json();
      console.log('📅 [API ROUTE] Agendamentos recebidos:', data);

      return Response.json(data, { status: response.status });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('📅 [API ROUTE] ❌ Timeout ao conectar com backend');
        return Response.json(
          { 
            errors: [{ detail: 'Timeout ao conectar com o backend' }] 
          },
          { status: 504 }
        );
      }
      
      console.error('📅 [API ROUTE] ❌ Erro ao fazer fetch:', fetchError);
      console.error('📅 [API ROUTE] Tipo do erro:', fetchError?.constructor?.name);
      console.error('📅 [API ROUTE] Mensagem:', fetchError?.message);
      console.error('📅 [API ROUTE] Código:', fetchError?.code);
      console.error('📅 [API ROUTE] Stack:', fetchError?.stack);
      
      if (fetchError?.message?.includes('fetch failed') || fetchError?.code === 'ECONNREFUSED' || fetchError?.cause?.code === 'ECONNREFUSED') {
        return Response.json(
          { 
            errors: [{ 
              detail: `Não foi possível conectar ao backend em ${backendUrl.toString()}. Verifique se o backend está rodando na porta 3002.` 
            }] 
          },
          { status: 503 }
        );
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('📅 [API ROUTE] ❌ Erro geral:', error);
    return Response.json(
      { 
        errors: [{ detail: error?.message || 'Erro ao buscar agendamentos de SDRs' }] 
      },
      { status: 500 }
    );
  }
}
