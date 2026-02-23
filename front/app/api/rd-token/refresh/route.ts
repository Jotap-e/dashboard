import { NextRequest } from 'next/server';
import { getBackendUrl } from '@/lib/config/backend';

export async function POST(request: NextRequest) {
  try {
    const backendHost = getBackendUrl();
    const url = `${backendHost}/api/rd-token/refresh`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(result, { status: response.status });
    }

    return Response.json(result, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer refresh do token';
    return Response.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
