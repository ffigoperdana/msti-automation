export interface FluxField {
  name: string;
  values: any[];
  type?: string;
  config?: Record<string, any>;
}

export interface FluxSeries {
  fields: FluxField[];
}

export interface FluxQueryResponse {
  series: FluxSeries[];
}

export interface FluxQueryParams {
  dataSourceId: string;
  query: string;
  timeRange?: {
    from: string;
    to: string;
  };
  refreshInterval?: number;
} 