import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const closerNome = searchParams.get('closerNome');
    const dataCriacao = searchParams.get('dataCriacao');

    if (!closerNome) {
      return Response.json(
        { success: false, message: 'closerNome é obrigatório' },
        { status: 400 }
      );
    }

    const backendHost = process.env.BACKEND_URL || 'http://localhost:3002';
    const url = new URL(`${backendHost}/api/forecasts`);
    url.searchParams.set('closerNome', closerNome);
    if (dataCriacao) url.searchParams.set('dataCriacao', dataCriacao);

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
    const message = error instanceof Error ? error.message : 'Erro ao buscar forecasts';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const backendHost = process.env.BACKEND_URL || 'http://localhost:3002';
    const backendUrl = `${backendHost}/api/forecasts`;

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
    const message = error instanceof Error ? error.message : 'Erro ao salvar forecast';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
