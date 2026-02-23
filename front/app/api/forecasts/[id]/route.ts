import { NextRequest } from 'next/server';
import { getBackendUrl } from '@/lib/config/backend';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json(
        { success: false, message: 'ID do forecast obrigatório' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const backendHost = getBackendUrl();
    const backendUrl = `${backendHost}/api/forecasts/${encodeURIComponent(id)}`;

    const response = await fetch(backendUrl, {
      method: 'PUT',
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
    const message = error instanceof Error ? error.message : 'Erro ao atualizar forecast';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json(
        { success: false, message: 'ID do forecast obrigatório' },
        { status: 400 }
      );
    }

    const backendHost = getBackendUrl();
    const backendUrl = `${backendHost}/api/forecasts/${encodeURIComponent(id)}`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    return Response.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao remover forecast';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
