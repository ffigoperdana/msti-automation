# Visualization System Guide
## MSTI Automation - Standardized Visualization Components

### Overview
Sistem visualisasi MSTI Automation telah di-standardisasi untuk mendukung berbagai jenis visualisasi seperti Time Series, Gauge, Table, dan Interface monitoring. Sistem ini dirancang untuk reusability dan extensibility.

## Architecture

### 1. Visualization Components Structure
```
frontend/src/components/visualizations/
├── index.ts                 # Export all components & types
├── TimeSeries.tsx          # Line/area charts for time-based data
├── Gauge.tsx               # Circular gauge for single values
├── Table.tsx               # Tabular data display
└── Interface.tsx           # Network interface status cards
```

### 2. Component Registry System
```typescript
// Automatic component loading based on panel type
export const VISUALIZATION_COMPONENTS = {
  'time-series': TimeSeries,
  'gauge': Gauge,
  'table': Table,
  'interface': Interface,
  'interface-status': Interface, // Legacy support
} as const;
```

### 3. Standardized Props Interface
```typescript
interface VisualizationComponentProps {
  data: Record<string, QueryResult>;
  options: Record<string, any>;
  title?: string;
}
```

## Visualization Types

### 1. Time Series (`time-series`)
**Purpose**: Display time-based metrics in line/area charts
**Library**: ECharts
**Use Cases**: CPU usage, network traffic, response times

**Options**:
```typescript
{
  unit?: string;           // 'MB', '%', 'ms'
  decimals?: number;       // Number of decimal places
  yAxis?: {
    min?: number;
    max?: number;
  };
}
```

**Data Format**:
```typescript
{
  series: [{
    name: string;
    data: Array<{
      time: string;        // ISO timestamp
      value: number;
    }>;
  }]
}
```

### 2. Gauge (`gauge`)
**Purpose**: Display single numeric values in circular gauge
**Library**: ECharts
**Use Cases**: CPU percentage, disk usage, temperature

**Options**:
```typescript
{
  unit?: string;           // Unit suffix
  decimals?: number;       // Decimal places
  min?: number;            // Minimum value (default: 0)
  max?: number;            // Maximum value (default: 100)
  thresholds?: {
    steps: Array<{
      value: number;       // Threshold value
      color: string;       // Color for this range
    }>;
  };
}
```

### 3. Table (`table`)
**Purpose**: Display tabular data with sorting and pagination
**Library**: Custom React component
**Use Cases**: Log entries, device lists, alert history

**Options**:
```typescript
{
  showHeader?: boolean;    // Show table header (default: true)
  pageSize?: number;       // Rows per page (default: 10)
  fontSize?: string;       // CSS font size class
  sortable?: boolean;      // Enable sorting (default: true)
  decimals?: number;       // Decimal places for numbers
}
```

### 4. Interface (`interface`)
**Purpose**: Display network interface status cards
**Library**: Custom React component  
**Use Cases**: Network monitoring, device status

**Options**:
```typescript
{
  deviceField?: string;    // Field name for device
  nameField?: string;      // Field name for interface name
  statusField?: string;    // Field name for status (up/down)
  speedField?: string;     // Field name for speed
  duplexField?: string;    // Field name for duplex mode
  bytesInField?: string;   // Field name for input bytes
  bytesOutField?: string;  // Field name for output bytes
  errorsField?: string;    // Field name for error count
}
```

## Usage Examples

### 1. Creating a Time Series Panel
```typescript
const panel = {
  id: 'cpu-usage',
  title: 'CPU Usage',
  type: 'time-series',
  options: {
    unit: '%',
    decimals: 1,
    yAxis: { min: 0, max: 100 }
  },
  queries: [{
    refId: 'A',
    query: 'from(bucket: "metrics") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "cpu")',
    dataSourceId: 'influxdb-1'
  }]
};
```

### 2. Creating a Gauge Panel
```typescript
const panel = {
  id: 'memory-usage',
  title: 'Memory Usage',
  type: 'gauge',
  options: {
    unit: '%',
    min: 0,
    max: 100,
    thresholds: {
      steps: [
        { value: 0, color: '#00FF00' },   // Green 0-50%
        { value: 50, color: '#FFFF00' },  // Yellow 50-80%
        { value: 80, color: '#FF0000' }   // Red 80-100%
      ]
    }
  }
};
```

### 3. Creating an Interface Panel
```typescript
const panel = {
  id: 'network-interfaces',
  title: 'Network Interfaces',
  type: 'interface',
  options: {
    deviceField: 'device',
    nameField: 'interface',
    statusField: 'status',
    speedField: 'speed',
    bytesInField: 'bytes_in',
    bytesOutField: 'bytes_out'
  }
};
```

## Component Architecture

### 1. VisualizationPanel (Container)
```typescript
// Main container that handles:
// - Data fetching from API
// - Loading states
// - Error handling  
// - Panel menu (edit/delete)
// - Dynamic component loading
```

### 2. Individual Visualization Components
```typescript
// Each visualization component handles:
// - Data transformation
// - Chart rendering
// - User interactions
// - Responsive design
```

## Adding New Visualization Types

### 1. Create Component
```typescript
// src/components/visualizations/NewVisualization.tsx
import React from 'react';
import { VisualizationComponentProps } from './index';

const NewVisualization: React.FC<VisualizationComponentProps> = ({ 
  data, 
  options, 
  title 
}) => {
  // Your visualization logic here
  return <div>Your visualization</div>;
};

export default NewVisualization;
```

### 2. Register Component
```typescript
// src/components/visualizations/index.ts
export { default as NewVisualization } from './NewVisualization';

export const VISUALIZATION_COMPONENTS = {
  // ... existing components
  'new-visualization': NewVisualization,
} as const;
```

### 3. Update Types
```typescript
export enum VisualizationType {
  // ... existing types
  NEW_VISUALIZATION = 'new-visualization',
}
```

## Data Flow

### 1. Panel Query Execution
```
Dashboard.tsx → VisualizationPanel → metricService.executePanelQuery()
```

### 2. Data Transformation
```
Raw API Response → Transform to Component Format → Render Visualization
```

### 3. Real-time Updates
```
Auto-refresh (30s) → Re-fetch Data → Update Component → Re-render
```

## Best Practices

### 1. Component Design
- **Stateless**: Visualization components should be stateless
- **Props-driven**: All configuration via props
- **Responsive**: Handle different container sizes
- **Error handling**: Graceful degradation on data issues

### 2. Data Handling
- **Null safety**: Handle missing/null data gracefully
- **Type checking**: Validate data structure
- **Performance**: Optimize for large datasets

### 3. Styling
- **Consistent**: Use Tailwind CSS classes
- **Accessible**: Support screen readers
- **Mobile-friendly**: Responsive design

### 4. Testing
- **Unit tests**: Test data transformation logic
- **Integration tests**: Test with real data
- **Visual tests**: Verify chart rendering

## Migration from Legacy

### Old Interface Status Panel
```typescript
// OLD: Hardcoded in Dashboard.tsx
<InterfaceStatusPanel panel={panel} />

// NEW: Standardized component
<VisualizationPanel panel={panel} />
```

The new system automatically handles all panel types through the component registry, making it easy to add new visualization types without modifying the Dashboard component. 