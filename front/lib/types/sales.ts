// Tipos para o dashboard de vendas

export interface SalesKPI {
  totalRevenue: number;
  targetRevenue: number;
  targetAchievement: number;
  pipelineOpen: number;
  winRate: number;
  winRateChange: number;
  avgSalesCycle: number;
}

export interface ForecastData {
  category: string;
  value: number;
  color: string;
}

export interface TrendData {
  date: string;
  target: number;
  actual: number;
  forecast: number;
}

export interface SDRPerformance {
  name: string;
  meetingsScheduled: number;
  meetingsCompleted: number;
  sqlsGenerated: number;
}

export interface SDRFunnel {
  stage: string;
  value: number;
  conversionRate: number;
}

export interface CloserPerformance {
  name: string;
  revenue: number;
  target: number;
  pipeline: number;
  winRate: number;
  dealsCount: number;
}

export interface SalesDashboardData {
  kpis: SalesKPI;
  forecast: ForecastData[];
  trends: TrendData[];
  sdrs: SDRPerformance[];
  sdrFunnel: SDRFunnel[];
  closers: CloserPerformance[];
}
