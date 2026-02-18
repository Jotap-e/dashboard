# 📊 Dashboard de Vendas - Comando Central

Dashboard estratégico e tático de vendas para monitoramento em tempo real (MTD/QTD), desenvolvido para integração futura com RD Station.

## 🎯 Objetivo

Fornecer uma visão completa e hierárquica da performance de vendas, desde KPIs principais até análises detalhadas de equipes de pré-vendas (SDRs) e vendas (Closers).

## 📍 Acesso

O dashboard está disponível em: `/vendas`

## 📋 Estrutura do Dashboard

### Seção 1: O Placar (KPIs Principais)

Visão imediata da saúde da operação com 5 KPIs principais:

1. **Receita Total Fechada (R$)**
   - Valor acumulado do período
   - Comparativo com meta e diferença
   - Indicador de status (verde/amarelo/vermelho)

2. **Atingimento da Meta (%)**
   - Gráfico de velocímetro (Gauge)
   - Zonas de cor: <70% Vermelho, 70-90% Amarelo, >90% Verde

3. **Total de Pipeline Aberto (R$)**
   - Valor total de oportunidades ativas
   - Múltiplo de cobertura em relação à meta restante

4. **Win Rate Global (%)**
   - Taxa média de conversão do time
   - Comparativo com período anterior

5. **Ciclo Médio de Vendas (Dias)**
   - Média de dias da criação ao fechamento

### Seção 2: Visão de Forecast

Análise de previsão e pipeline:

1. **Funil de Forecast**
   - Gráfico de barras horizontais
   - Categorias:
     - Já Fechado (Verde)
     - Compromisso (>90%) (Azul)
     - Provável (60-80%) (Amarelo)
     - Pipeline (<50%) (Cinza)
   - Mostra cobertura total vs. meta

2. **Tendência de Fechamento vs. Meta**
   - Gráfico de linha e área combinados
   - Linha de meta alvo (acumulado ideal)
   - Linha de realizado (receita fechada acumulada)
   - Área de forecast ponderado (projeção)

### Seção 3: Performance do Time de Pré-Vendas (SDRs)

Avaliação da eficiência e volume do topo do funil:

1. **Leaderboard de Geração**
   - Gráfico de barras horizontais
   - Métricas por SDR:
     - Reuniões Agendadas
     - Reuniões Realizadas
     - SQLs Gerados
   - Ordenado por SQLs Gerados

2. **Funil de Conversão SDR**
   - Gráfico de barras horizontais empilhadas
   - Etapas:
     - Leads Trabalhados
     - Reuniões Agendadas
     - Reuniões Realizadas
     - SQLs Gerados
   - Taxas de conversão entre etapas

### Seção 4: Performance do Time de Vendas (Closers)

Avaliação de receita e eficiência individual:

1. **Leaderboard de Receita vs. Meta**
   - Gráfico de barras agrupadas horizontais
   - Receita fechada vs. meta individual
   - Ordenado por % de atingimento

2. **Matriz de Eficiência: Win Rate x Pipeline**
   - Gráfico de dispersão (Scatter Plot)
   - Eixo X: Volume de Pipeline
   - Eixo Y: Taxa de Conversão (Win Rate)
   - Linhas de média para criar 4 quadrantes:
     - Alto Pipeline / Alto Win Rate (Verde)
     - Baixo Pipeline / Alto Win Rate (Azul)
     - Alto Pipeline / Baixo Win Rate (Amarelo)
     - Baixo Pipeline / Baixo Win Rate (Vermelho)

3. **Cobertura de Pipeline**
   - Gráfico de barras horizontais
   - Múltiplo de cobertura (Pipeline / Meta Restante)
   - Linha de referência na meta ideal (3x)

## 🛠️ Tecnologias Utilizadas

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Recharts** - Biblioteca de gráficos
- **shadcn/ui** - Componentes UI
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones

## 📦 Estrutura de Arquivos

```
front/
├── app/
│   └── vendas/
│       └── page.tsx              # Página principal do dashboard
├── components/
│   ├── dashboard/
│   │   ├── kpi-card.tsx          # Card de KPI
│   │   ├── gauge-chart.tsx      # Gráfico de velocímetro
│   │   ├── forecast-funnel.tsx   # Funil de forecast
│   │   ├── trend-chart.tsx       # Gráfico de tendência
│   │   ├── sdr-leaderboard.tsx  # Leaderboard SDRs
│   │   ├── sdr-funnel.tsx       # Funil SDR
│   │   ├── closer-leaderboard.tsx # Leaderboard Closers
│   │   ├── efficiency-matrix.tsx # Matriz de eficiência
│   │   └── pipeline-coverage.tsx # Cobertura de pipeline
│   └── ui/
│       ├── card.tsx              # Componente Card
│       └── badge.tsx             # Componente Badge
├── lib/
│   ├── types/
│   │   └── sales.ts              # Tipos TypeScript
│   └── data/
│       └── mock-sales.ts         # Dados mockados
```

## 🔌 Integração Futura com RD Station

O dashboard está preparado para integração com RD Station. Os dados mockados em `lib/data/mock-sales.ts` devem ser substituídos por chamadas à API do RD Station.

### Endpoints Sugeridos

1. **KPIs Principais**
   - Receita total fechada
   - Meta do período
   - Pipeline aberto
   - Win rate global
   - Ciclo médio

2. **Forecast**
   - Oportunidades por estágio de forecast
   - Histórico de fechamentos

3. **SDRs**
   - Reuniões agendadas/realizadas por SDR
   - SQLs gerados
   - Funil de conversão

4. **Closers**
   - Receita por vendedor
   - Pipeline por vendedor
   - Win rate individual
   - Deals fechados

## 🎨 Cores e Status

- **Verde** (#22c55e): Positivo/Na Meta
- **Amarelo** (#f59e0b): Atenção/Cuidado
- **Vermelho** (#ef4444): Negativo/Abaixo da Meta
- **Azul** (#3b82f6): Informação/Neutro
- **Cinza** (#94a3b8): Secundário/Meta

## 📝 Formatação de Valores

- **Moeda**: Formato brasileiro (R$ 1.000,00)
- **Porcentagem**: 1 casa decimal (32.5%)
- **Números**: Separador de milhar (1.000)

## 🚀 Próximos Passos

1. Integração com API do RD Station
2. Autenticação e autorização
3. Filtros por período (MTD/QTD/YTD)
4. Exportação de relatórios (PDF/Excel)
5. Notificações e alertas
6. Histórico e comparações temporais
