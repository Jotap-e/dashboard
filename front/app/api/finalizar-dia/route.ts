import { getBackendUrl } from '@/lib/config/backend';

export async function POST() {
  try {
    const backendHost = getBackendUrl();

    const res = await fetch(`${backendHost}/api/finalizar-dia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { success: false, message: data.message || 'Erro ao finalizar o dia' },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao finalizar o dia';
    return Response.json({ success: false, message }, { status: 500 });
  }
}
