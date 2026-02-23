import { NextRequest } from 'next/server';
import { getBackendUrl } from '@/lib/config/backend';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data');
    const vendedorId = searchParams.get('vendedorId');

    const backendHost = getBackendUrl();
    const url = new URL(`${backendHost}/api/vendas`);
    if (data) url.searchParams.set('data', data);
    if (vendedorId) url.searchParams.set('vendedorId', vendedorId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(result, { status: response.status });
    }

    return Response.json(result, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar vendas';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const negociacaoId = searchParams.get('negociacaoId');
    const vendedorId = searchParams.get('vendedorId');
    const data = searchParams.get('data');

    if (!negociacaoId || !vendedorId) {
      return Response.json(
        { success: false, message: 'negociacaoId e vendedorId obrigatórios' },
        { status: 400 }
      );
    }

    const backendHost = getBackendUrl();
    const url = new URL(`${backendHost}/api/vendas`);
    url.searchParams.set('negociacaoId', negociacaoId);
    url.searchParams.set('vendedorId', vendedorId);
    if (data) url.searchParams.set('data', data);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(result, { status: response.status });
    }

    return Response.json(result, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao reverter venda';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const backendHost = getBackendUrl();
    const backendUrl = `${backendHost}/api/vendas`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    return Response.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar venda';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
