import Text from './Text';
import Stat from './Stat';
import Gauge from './Gauge';
import Interface from './Interface';
import Table from './Table';
import TimeSeries from './TimeSeries';
import ChordDiagram from './ChordDiagram';

// Visualization Components Export
export { default as Text } from './Text';
export { default as Stat } from './Stat';
export { default as TimeSeries } from './TimeSeries';
export { default as Gauge } from './Gauge';
export { default as Table } from './Table';
export { default as Interface } from './Interface';
export { default as ChordDiagram } from './ChordDiagram';

// Common visualization props interface
export interface BaseVisualizationProps {
  data: Record<string, any>;
  options?: Record<string, any>;
  title?: string;
  height?: number | string;
  width?: number | string;
}

// Visualization type enum
export enum VisualizationType {
  TEXT = 'text',
  STAT = 'stat',
  TIME_SERIES = 'time-series',
  GAUGE = 'gauge', 
  TABLE = 'table',
  INTERFACE = 'interface',
  INTERFACE_STATUS = 'interface-status', // Legacy support
  CHORD_DIAGRAM = 'chord-diagram'
}

// Visualization registry for dynamic component loading
export const VISUALIZATION_COMPONENTS = {
  [VisualizationType.TEXT]: Text,
  [VisualizationType.STAT]: Stat,
  [VisualizationType.TIME_SERIES]: TimeSeries,
  [VisualizationType.GAUGE]: Gauge,
  [VisualizationType.TABLE]: Table,
  [VisualizationType.INTERFACE]: Interface,
  [VisualizationType.INTERFACE_STATUS]: Interface, // Legacy mapping
  [VisualizationType.CHORD_DIAGRAM]: ChordDiagram,
} as const;

// Type for visualization component props
export interface VisualizationComponentProps {
  data: Record<string, any>;
  options: Record<string, any>;
  title?: string;
}

// Helper function to get visualization component
export const getVisualizationComponent = (type: string) => {
  // Normalize type string
  const normalizedType = type?.toLowerCase().replace(/[_-]/g, '-');
  
  // Direct mapping for common types
  const typeMapping: Record<string, keyof typeof VISUALIZATION_COMPONENTS> = {
    'text': VisualizationType.TEXT,
    'stat': VisualizationType.STAT,
    'timeseries': VisualizationType.TIME_SERIES,
    'time-series': VisualizationType.TIME_SERIES,
    'gauge': VisualizationType.GAUGE,
    'memory-usage': VisualizationType.GAUGE, // Map memory-usage to gauge
    'table': VisualizationType.TABLE,
    'interface': VisualizationType.INTERFACE,
    'interface-status': VisualizationType.INTERFACE_STATUS,
    'chord-diagram': VisualizationType.CHORD_DIAGRAM,
    'chorddiagram': VisualizationType.CHORD_DIAGRAM,
    'chord': VisualizationType.CHORD_DIAGRAM,
  };
  
  // First try direct mapping
  const mappedType = typeMapping[normalizedType];
  
  if (mappedType) {
    const component = VISUALIZATION_COMPONENTS[mappedType];
    return component;
  }
  
  // Fallback to exact match
  const fallbackComponent = VISUALIZATION_COMPONENTS[type as keyof typeof VISUALIZATION_COMPONENTS];
  return fallbackComponent;
}; 