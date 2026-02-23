import { NextRequest } from 'next/server';
import { VENDEDOR_IDS, getVendedorTipo } from '@/lib/utils/vendedores';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data') ?? new Date().toISOString().split('T')[0];

    const backendHost = process.env.BACKEND_URL || 'http://localhost:3002';

    // IDs dos closers para contagem via GET by vendedorId (apenas para finalizar-dia)
    const closerIds = Object.entries(VENDEDOR_IDS)
      .filter(([nome]) => getVendedorTipo(nome) === 'closer')
      .map(([, id]) => id);

    // Buscar reunioes por vendedorId apenas para finalizar-dia (planilha)
    // Durante o dia, o painel usa qtd_reunioes do WebSocket (não busca do banco)
    const [forecastsRes, vendasRes, reunioesRes, ...reunioesPorCloserRes] = await Promise.all([
      fetch(`${backendHost}/api/forecasts/dia?data=${encodeURIComponent(data)}`, {
        headers: { Accept: 'application/json' },
      }),
      fetch(`${backendHost}/api/vendas?data=${encodeURIComponent(data)}`, {
        headers: { Accept: 'application/json' },
      }),
      fetch(`${backendHost}/api/reunioes?data=${encodeURIComponent(data)}`, {
        headers: { Accept: 'application/json' },
      }),
      ...closerIds.map((vendedorId) =>
        fetch(`${backendHost}/api/reunioes?vendedorId=${encodeURIComponent(vendedorId)}&data=${encodeURIComponent(data)}`, {
          headers: { Accept: 'application/json' },
        })
      ),
    ]);

    const [forecastsData, vendasData, reunioesData, ...reunioesPorCloserData] = await Promise.all([
      forecastsRes.json(),
      vendasRes.json(),
      reunioesRes.json(),
      ...reunioesPorCloserRes.map((r) => r.json()),
    ]);

    const forecasts = forecastsData.success ? forecastsData.data : [];
    const vendas = vendasData.success ? vendasData.data : [];
    const reunioes = reunioesData.success ? reunioesData.data : [];
    const faturamentoTotal = vendasData.valorTime ?? vendas.reduce((s: number, v: { valorNegociacao: number }) => s + v.valorNegociacao, 0);

    // Contagem por closer via GET by vendedorId (para planilha do finalizar-dia)
    const reunioesPorVendedor: Record<string, number> = {};
    closerIds.forEach((vendedorId, i) => {
      const json = reunioesPorCloserData[i];
      reunioesPorVendedor[vendedorId] = json?.success ? (json.count ?? json.data?.length ?? 0) : 0;
    });

    return Response.json({
      success: true,
      data: {
        data,
        forecasts,
        vendas,
        reunioes,
        reunioesPorVendedor, // Usado apenas no finalizar-dia-dialog
        faturamentoTotal,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar resumo do dia';
    return Response.json({ success: false, message }, { status: 500 });
  }
}
