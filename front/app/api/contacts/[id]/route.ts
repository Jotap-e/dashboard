import { NextRequest } from 'next/server';
import { getBackendUrl } from '@/lib/config/backend';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return Response.json(
        { success: false, message: 'ID do contato é obrigatório' },
        { status: 400 }
      );
    }

    const backendHost = getBackendUrl();
    const url = `${backendHost}/api/contacts/${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(result, { status: response.status });
    }

    return Response.json(result, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar contato';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return Response.json(
        { success: false, message: 'ID do contato é obrigatório' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const backendHost = getBackendUrl();
    const url = `${backendHost}/api/contacts/${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(result, { status: response.status });
    }

    return Response.json(result, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar contato';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
