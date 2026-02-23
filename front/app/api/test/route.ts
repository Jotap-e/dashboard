// Exemplo de API Route do Next.js que chama o backend
export async function GET() {
  try {
    const response = await fetch('http://localhost:3002/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Backend não está respondendo');
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return Response.json(
      { error: 'Erro ao conectar com o backend', message: errorMessage },
      { status: 500 }
    );
  }
}
