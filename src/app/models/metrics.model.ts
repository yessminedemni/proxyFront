export interface MetricData {
  timestamp: number;
  value: number;
}

export interface ScenarioMetrics {
  name: string;
  data: MetricData[];
  packetLoss: MetricData[];
  latency: MetricData[];
  queryLoad: MetricData[];
  queryBlackhole: MetricData[];
  connectionKill: MetricData[];
  diskFault: MetricData[];
}

export type MetricKey = keyof Omit<ScenarioMetrics, 'name' | 'data'>; 