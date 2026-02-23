'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, X, Calendar, CheckCircle } from 'lucide-react';
import { VENDEDOR_IDS } from '@/lib/utils/vendedores';

/** Limpa localStorage do painel e controles de todos os closers */
function clearLocalStorageFinalizarDia(): void {
  if (typeof window === 'undefined') return;
  try {
    // Painel
    localStorage.removeItem('painel_deals_now_map');
    localStorage.removeItem('painel_forecasts_map');

    // Controle - por vendedor
    Object.keys(VENDEDOR_IDS).forEach((vendedor) => {
      localStorage.removeItem(`controle_now_id_${vendedor}`);
      localStorage.removeItem(`controle_deals_${vendedor}`);
      localStorage.removeItem(`controle_forecasts_${vendedor}`);
      localStorage.removeItem(`valor_acumulado_${vendedor}`);
      localStorage.removeItem(`controle_visualizacao_${vendedor}`);
    });

    // Negociações vendidas (todas as chaves que começam com negociacao_vendida_)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('negociacao_vendida_')) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    console.log('🧹 [FINALIZAR] localStorage limpo (painel e controles)');
  } catch (err) {
    console.error('❌ [FINALIZAR] Erro ao limpar localStorage:', err);
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (s: string) => {
  if (!s) return '-';
  try {
    return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR');
  } catch {
    return s;
  }
};

interface ResumoDiaData {
  data: string;
  forecasts: Array<{
    closerNome?: string;
    clienteNome?: string;
    clienteNumero?: string;
    data?: string;
    horario?: string;
    valor?: number;
    observacoes?: string;
    primeiraCall?: string;
  }>;
  vendas: Array<{
    vendedorNome?: string;
    valorNegociacao?: number;
    negociacaoId?: string;
    data?: string;
  }>;
  reunioes: Array<{
    vendedorNome?: string;
    clienteNome?: string;
    clienteNumero?: string;
    negociacaoId?: string;
    data?: string;
  }>;
  faturamentoTotal: number;
}

interface FinalizarDiaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinalizarDiaDialog({ open, onOpenChange }: FinalizarDiaDialogProps) {
  const [dataSelecionada, setDataSelecionada] = React.useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = React.useState(false);
  const [finalizando, setFinalizando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resumo, setResumo] = React.useState<ResumoDiaData | null>(null);

  const fetchResumo = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumo-dia?data=${encodeURIComponent(dataSelecionada)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Erro ao buscar dados');
      setResumo(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar resumo');
      setResumo(null);
    } finally {
      setLoading(false);
    }
  }, [dataSelecionada]);

  React.useEffect(() => {
    if (open) {
      fetchResumo();
    }
  }, [open, fetchResumo]);

  const handleFinalizarDia = React.useCallback(async () => {
    setFinalizando(true);
    setError(null);
    try {
      const res = await fetch('/api/finalizar-dia', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Erro ao finalizar o dia');

      clearLocalStorageFinalizarDia();
      onOpenChange(false);
      // Recarrega a página para garantir que painel e controles exibam estado limpo
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar o dia');
    } finally {
      setFinalizando(false);
    }
  }, [onOpenChange]);

  const exportCSV = React.useCallback(() => {
    if (!resumo) return;
    const lines: string[] = [];
    lines.push('RESUMO DO DIA - ' + formatDate(resumo.data));
    lines.push('');
    lines.push('ANÁLISE GERAL DO TIME');
    lines.push('Data;' + formatDate(resumo.data));
    lines.push('Total Forecasts;' + resumo.forecasts.length);
    lines.push('Total Reuniões;' + resumo.reunioes.length);
    lines.push('Total Vendas;' + resumo.vendas.length);
    lines.push('Faturamento Total;' + formatCurrency(resumo.faturamentoTotal));
    lines.push('');

    lines.push('FORECASTS DO DIA');
    lines.push('Closer;Cliente;Número;Data;Horário;Valor;Observações;Primeira Call');
    resumo.forecasts.forEach((f) => {
      lines.push(
        [
          f.closerNome || '',
          f.clienteNome || '',
          f.clienteNumero || '',
          formatDate(f.data || ''),
          f.horario || '',
          f.valor ?? '',
          (f.observacoes || '').replace(/;/g, ','),
          formatDate(f.primeiraCall || ''),
        ].join(';')
      );
    });
    lines.push('');

    lines.push('REUNIÕES DO DIA');
    lines.push('Closer;Cliente;Telefone');
    resumo.reunioes.forEach((r) => {
      lines.push(
        [
          r.vendedorNome || '',
          r.clienteNome || '',
          r.clienteNumero || '',
        ].join(';')
      );
    });
    lines.push('');

    lines.push('VENDAS DO DIA');
    lines.push('Vendedor;Valor;Negociação ID;Data');
    resumo.vendas.forEach((v) => {
      lines.push(
        [
          v.vendedorNome || '',
          formatCurrency(v.valorNegociacao ?? 0),
          v.negociacaoId || '',
          formatDate(v.data || ''),
        ].join(';')
      );
    });

    const blob = new Blob(['\ufeff' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-dia-${resumo.data}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resumo]);

  const exportXLS = React.useCallback(() => {
    if (!resumo) return;
    const escape = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows: string[] = [];
    rows.push('<table border="1">');
    rows.push('<tr><th colspan="2">RESUMO DO DIA - ' + escape(formatDate(resumo.data)) + '</th></tr>');
    rows.push('<tr><td>Data</td><td>' + escape(formatDate(resumo.data)) + '</td></tr>');
    rows.push('<tr><td>Total Forecasts</td><td>' + resumo.forecasts.length + '</td></tr>');
    rows.push('<tr><td>Total Reuniões</td><td>' + resumo.reunioes.length + '</td></tr>');
    rows.push('<tr><td>Total Vendas</td><td>' + resumo.vendas.length + '</td></tr>');
    rows.push('<tr><td>Faturamento Total</td><td>' + escape(formatCurrency(resumo.faturamentoTotal)) + '</td></tr>');
    rows.push('<tr><td colspan="2"></td></tr>');
    rows.push('<tr><th colspan="8" style="text-align:center">FORECASTS DO DIA</th></tr>');
    rows.push('<tr><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:120px">Closer</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:150px">Cliente</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:100px">Número</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:90px">Data</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:70px">Horário</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:100px">Valor</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:150px">Observações</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:100px">Primeira Call</th></tr>');
    resumo.forecasts.forEach((f) => {
      rows.push('<tr><td style="padding:6px;word-wrap:break-word;max-width:200px">' + escape(f.closerNome) + '</td><td style="padding:6px;word-wrap:break-word;max-width:250px">' + escape(f.clienteNome) + '</td><td style="padding:6px;word-wrap:break-word">' + escape(f.clienteNumero) + '</td><td style="padding:6px;white-space:nowrap">' + escape(formatDate(f.data || '')) + '</td><td style="padding:6px;white-space:nowrap">' + escape(f.horario) + '</td><td style="padding:6px;white-space:nowrap">' + escape(f.valor != null ? formatCurrency(f.valor) : '') + '</td><td style="padding:6px;word-wrap:break-word;max-width:300px">' + escape(f.observacoes) + '</td><td style="padding:6px;white-space:nowrap">' + escape(formatDate(f.primeiraCall || '')) + '</td></tr>');
    });
    rows.push('<tr><td colspan="8"></td></tr>');
    rows.push('<tr><th colspan="3" style="text-align:center">REUNIÕES DO DIA</th></tr>');
    rows.push('<tr><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:180px">Closer</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:150px">Cliente</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:120px">Telefone</th></tr>');
    resumo.reunioes.forEach((r) => {
      rows.push('<tr><td style="padding:6px;word-wrap:break-word;max-width:250px">' + escape(r.vendedorNome) + '</td><td style="padding:6px;word-wrap:break-word;max-width:250px">' + escape(r.clienteNome) + '</td><td style="padding:6px;word-wrap:break-word">' + escape(r.clienteNumero) + '</td></tr>');
    });
    rows.push('<tr><td colspan="3"></td></tr>');
    rows.push('<tr><th colspan="4" style="text-align:center">VENDAS DO DIA</th></tr>');
    rows.push('<tr><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:150px">Vendedor</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:120px">Valor</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:150px">Negociação ID</th><th style="background-color:#4A5568;color:#fff;padding:8px;min-width:100px">Data</th></tr>');
    resumo.vendas.forEach((v) => {
      rows.push('<tr><td style="padding:6px;word-wrap:break-word;max-width:250px">' + escape(v.vendedorNome) + '</td><td style="padding:6px;white-space:nowrap">' + escape(formatCurrency(v.valorNegociacao ?? 0)) + '</td><td style="padding:6px;word-wrap:break-word">' + escape(v.negociacaoId) + '</td><td style="padding:6px;white-space:nowrap">' + escape(formatDate(v.data || '')) + '</td></tr>');
    });
    rows.push('</table>');
    const html = '<?xml version="1.0" encoding="UTF-8"?><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"/></head><body>' + rows.join('') + '</body></html>';
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-dia-${resumo.data}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resumo]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#1A1A1A] border-2 border-[#3A3A3A] rounded-lg shadow-2xl mx-2 sm:mx-4">
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-b border-[#3A3A3A]">
          <h2 className="text-white font-semibold order-1" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
            Finalizar dia
          </h2>
          <div className="flex flex-wrap items-center gap-2 order-2 sm:order-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="text-[#CCCCCC] flex-shrink-0" style={{ width: 18, height: 18 }} />
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="bg-[#2A2A2A] border border-[#3A3A3A] rounded px-2 py-1 text-white min-w-0"
                style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchResumo}
              disabled={loading}
              className="border-[#3A3A3A] text-[#CCCCCC] hover:bg-[#2A2A2A]"
              style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Atualizar'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-[#CCCCCC] hover:bg-[#2A2A2A] hover:text-white flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && !resumo ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#fed094] mb-4" style={{ width: 48, height: 48 }} />
              <p className="text-[#CCCCCC]">Carregando dados do dia...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300">{error}</p>
            </div>
          ) : resumo ? (
            <>
              {/* Resumo geral */}
              <Card className="bg-[#2A2A2A]/50 border-[#3A3A3A]">
                <CardHeader>
                  <CardTitle className="text-white text-base">Análise geral do time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                    <div>
                      <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>Data</p>
                      <p className="text-white font-medium truncate" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>{formatDate(resumo.data)}</p>
                    </div>
                    <div>
                      <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>Total Forecasts</p>
                      <p className="text-white font-medium" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>{resumo.forecasts.length}</p>
                    </div>
                    <div>
                      <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>Total Reuniões</p>
                      <p className="text-white font-medium" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>{resumo.reunioes.length}</p>
                    </div>
                    <div>
                      <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>Total Vendas</p>
                      <p className="text-white font-medium" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>{resumo.vendas.length}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[#CCCCCC]" style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.75rem)' }}>Faturamento</p>
                      <p className="text-[#fed094] font-bold truncate" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>{formatCurrency(resumo.faturamentoTotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela Forecasts */}
              <Card className="bg-[#2A2A2A]/50 border-[#3A3A3A]">
                <CardHeader>
                  <CardTitle className="text-white text-base">Forecasts do dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-hide">
                    <table className="w-full border-collapse" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', tableLayout: 'auto' }}>
                      <thead>
                        <tr className="border-b border-[#3A3A3A]">
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '120px' }}>Closer</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '150px' }}>Cliente</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '100px' }}>Número</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '90px' }}>Data</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '70px' }}>Horário</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '100px' }}>Valor</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '150px' }}>Observações</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '100px' }}>Primeira Call</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumo.forecasts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-[#CCCCCC] py-4 text-center">
                              Nenhum forecast cadastrado
                            </td>
                          </tr>
                        ) : (
                          resumo.forecasts.map((f, i) => (
                            <tr key={i} className="border-b border-[#3A3A3A]/50 hover:bg-[#2A2A2A]/70">
                              <td className="text-white py-2 px-3 break-words" style={{ wordBreak: 'break-word', maxWidth: '200px' }}>{f.closerNome || '-'}</td>
                              <td className="text-white py-2 px-3 break-words" style={{ wordBreak: 'break-word', maxWidth: '250px' }}>{f.clienteNome || '-'}</td>
                              <td className="text-[#CCCCCC] py-2 px-3 break-words" style={{ wordBreak: 'break-word' }}>{f.clienteNumero || '-'}</td>
                              <td className="text-[#CCCCCC] py-2 px-3 whitespace-nowrap">{formatDate(f.data || '')}</td>
                              <td className="text-[#CCCCCC] py-2 px-3 whitespace-nowrap">{f.horario || '-'}</td>
                              <td className="text-white py-2 px-3 whitespace-nowrap font-medium">{f.valor != null ? formatCurrency(f.valor) : '-'}</td>
                              <td className="text-[#CCCCCC] py-2 px-3 break-words" style={{ wordBreak: 'break-word', maxWidth: '300px' }}>{f.observacoes || '-'}</td>
                              <td className="text-[#CCCCCC] py-2 px-3 whitespace-nowrap">{formatDate(f.primeiraCall || '')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela Reuniões */}
              <Card className="bg-[#2A2A2A]/50 border-[#3A3A3A]">
                <CardHeader>
                  <CardTitle className="text-white text-base">Reuniões do dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-hide">
                    <table className="w-full border-collapse" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', tableLayout: 'auto' }}>
                      <thead>
                        <tr className="border-b border-[#3A3A3A]">
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '180px' }}>Closer</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '150px' }}>Cliente</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '120px' }}>Telefone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumo.reunioes.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-[#CCCCCC] py-4 text-center">
                              Nenhuma reunião registrada
                            </td>
                          </tr>
                        ) : (
                          resumo.reunioes.map((r, i) => (
                            <tr key={i} className="border-b border-[#3A3A3A]/50 hover:bg-[#2A2A2A]/70">
                              <td className="text-white py-2 px-3 break-words" style={{ wordBreak: 'break-word', maxWidth: '250px' }}>{r.vendedorNome || '-'}</td>
                              <td className="text-white py-2 px-3 break-words" style={{ wordBreak: 'break-word', maxWidth: '250px' }}>{r.clienteNome || '-'}</td>
                              <td className="text-[#CCCCCC] py-2 px-3 break-words" style={{ wordBreak: 'break-word' }}>{r.clienteNumero || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela Vendas */}
              <Card className="bg-[#2A2A2A]/50 border-[#3A3A3A]">
                <CardHeader>
                  <CardTitle className="text-white text-base">Faturamento do dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-hide">
                    <table className="w-full border-collapse" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', tableLayout: 'auto' }}>
                      <thead>
                        <tr className="border-b border-[#3A3A3A]">
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '150px' }}>Vendedor</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '120px' }}>Valor</th>
                          <th className="text-left text-[#CCCCCC] py-2 px-3 font-semibold" style={{ minWidth: '100px' }}>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumo.vendas.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-[#CCCCCC] py-4 text-center">
                              Nenhuma venda registrada
                            </td>
                          </tr>
                        ) : (
                          resumo.vendas.map((v, i) => (
                            <tr key={i} className="border-b border-[#3A3A3A]/50 hover:bg-[#2A2A2A]/70">
                              <td className="text-white py-2 px-3 break-words" style={{ wordBreak: 'break-word', maxWidth: '250px' }}>{v.vendedorNome || '-'}</td>
                              <td className="text-[#fed094] font-medium py-2 px-3 whitespace-nowrap">
                                {formatCurrency(v.valorNegociacao ?? 0)}
                              </td>
                              <td className="text-[#CCCCCC] py-2 px-3 whitespace-nowrap">{formatDate(v.data || '')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {resumo.vendas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#3A3A3A]">
                      <p className="text-[#CCCCCC] text-sm">
                        Total: <span className="text-[#fed094] font-bold">{formatCurrency(resumo.faturamentoTotal)}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {resumo && (
          <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-t border-[#3A3A3A]">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={exportCSV}
                className="bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] flex items-center gap-2 flex-1 sm:flex-initial"
                style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)' }}
              >
                <FileDown className="h-4 w-4 flex-shrink-0" />
                Exportar CSV
              </Button>
              <Button
                onClick={exportXLS}
                className="bg-[#fed094] text-[#1A1A1A] hover:bg-[#fed094]/90 flex items-center gap-2 flex-1 sm:flex-initial"
                style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)' }}
              >
                <FileDown className="h-4 w-4 flex-shrink-0" />
                Exportar XLS
              </Button>
            </div>
            <Button
              onClick={handleFinalizarDia}
              disabled={finalizando}
              className="bg-[#22c55e] text-white hover:bg-[#22c55e]/90 flex items-center gap-2"
              style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)' }}
            >
              {finalizando ? (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {finalizando ? 'Finalizando...' : 'Finalizar dia'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
