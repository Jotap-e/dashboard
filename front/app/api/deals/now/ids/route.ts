import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/deals/now/ids
 * Retorna apenas os IDs dos deals com flag "now" = true
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [API ROUTE] Buscando IDs de deals com flag "now"');

    const backendUrl = 'http://127.0.0.1:3001/api/deals/now/ids';
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.errors?.[0]?.detail || 'Erro ao buscar IDs de deals';
      console.error('❌ [API ROUTE] Erro ao buscar IDs de deals:', errorMessage);
      
      return NextResponse.json(
        { errors: [{ detail: errorMessage }] },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ [API ROUTE] IDs de deals recebidos:', { total: data.data?.length || 0 });
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [API ROUTE] Erro ao buscar IDs de deals:', error);
    return NextResponse.json(
      { errors: [{ detail: 'Erro ao conectar com o servidor' }] },
      { status: 500 }
    );
  }
}
