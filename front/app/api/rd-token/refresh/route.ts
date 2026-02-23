import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const backendHost = process.env.BACKEND_URL || 'http://localhost:3002';
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
