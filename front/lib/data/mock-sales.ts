import { SalesDashboardData } from '../types/sales';

export const mockSalesData: SalesDashboardData = {
  kpis: {
    totalRevenue: 450000,
    targetRevenue: 500000,
    targetAchievement: 90,
    pipelineOpen: 1750000,
    winRate: 32.5,
    winRateChange: 2.3,
    avgSalesCycle: 45,
  },
  forecast: [
    { category: 'Já Fechado', value: 450000, color: '#22c55e' },
    { category: 'Compromisso', value: 380000, color: '#3b82f6' },
    { category: 'Provável', value: 250000, color: '#f59e0b' },
    { category: 'Pipeline', value: 670000, color: '#94a3b8' },
  ],
  trends: [
    { date: '01/02', target: 16667, actual: 15000, forecast: 15000 },
    { date: '05/02', target: 83333, actual: 72000, forecast: 72000 },
    { date: '10/02', target: 166667, actual: 145000, forecast: 145000 },
    { date: '15/02', target: 250000, actual: 220000, forecast: 220000 },
    { date: '20/02', target: 333333, actual: 300000, forecast: 300000 },
    { date: '25/02', target: 416667, actual: 375000, forecast: 375000 },
    { date: '28/02', target: 500000, actual: 450000, forecast: 480000 },
  ],
  sdrs: [
    { name: 'Ana Silva', meetingsScheduled: 45, meetingsCompleted: 38, sqlsGenerated: 28 },
    { name: 'Carlos Santos', meetingsScheduled: 52, meetingsCompleted: 42, sqlsGenerated: 32 },
    { name: 'Mariana Costa', meetingsScheduled: 38, meetingsCompleted: 35, sqlsGenerated: 24 },
    { name: 'João Oliveira', meetingsScheduled: 41, meetingsCompleted: 36, sqlsGenerated: 26 },
    { name: 'Paula Lima', meetingsScheduled: 35, meetingsCompleted: 30, sqlsGenerated: 22 },
  ],
  sdrFunnel: [
    { stage: 'Leads Trabalhados', value: 1200, conversionRate: 100 },
    { stage: 'Reuniões Agendadas', value: 211, conversionRate: 17.6 },
    { stage: 'Reuniões Realizadas', value: 181, conversionRate: 15.1 },
    { stage: 'SQLs Gerados', value: 132, conversionRate: 11.0 },
  ],
  closers: [
    { name: 'Roberto Alves', revenue: 125000, target: 100000, pipeline: 350000, winRate: 38.5, dealsCount: 12 },
    { name: 'Fernanda Souza', revenue: 98000, target: 100000, pipeline: 280000, winRate: 35.0, dealsCount: 10 },
    { name: 'Lucas Pereira', revenue: 112000, target: 100000, pipeline: 320000, winRate: 35.0, dealsCount: 11 },
    { name: 'Juliana Rocha', revenue: 85000, target: 100000, pipeline: 250000, winRate: 34.0, dealsCount: 8 },
    { name: 'Ricardo Martins', revenue: 30000, target: 100000, pipeline: 550000, winRate: 5.5, dealsCount: 3 },
  ],
};
