export interface FluxField {
  name: string;
  type: string;
  values: any[];
  labels?: {
    source?: string;
    host?: string;
    id?: string;
    path?: string;
    [key: string]: string | undefined;
  };
  config?: {
    unit: string;
    displayName?: string;
    interfaceId?: string;
  };
}

export interface FluxSeries {
  name: any;
  fields: FluxField[];
  meta?: {
    interfaceId?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface QueryResult {
  series: FluxSeries[];
  state?: string;
}

export interface TimeSeriesStats {
  min: number;
  max: number;
  avg: number;
  current: number;
}

export interface ProcessedTimeSeriesData {
  timeField: string | null;
  series: EChartsSeriesData[];
  stats: Record<string, TimeSeriesStats>;
}

export interface EChartsSeriesData {
  name: string;
  type: string;
  data: [number, number][];
  smooth?: boolean;
  symbol?: string;
  lineStyle?: {
    width?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Additional interfaces needed by metricService
export interface FluxQueryParams {
  dataSourceId: string;
  query: string;
  variables?: Record<string, any>;
}

export interface FluxQueryResponse {
  state: string;
  series: FluxSeries[];
  data?: any;
}