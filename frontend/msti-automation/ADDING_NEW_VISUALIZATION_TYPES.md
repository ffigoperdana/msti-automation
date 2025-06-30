# Adding New Visualization Types - Developer Guide

## Overview
Panduan lengkap untuk menambahkan tipe visualisasi baru ke sistem MSTI Automation. Berdasarkan pengalaman implementasi gauge visualization yang cukup rumit karena kompleksitas backend-frontend integration.

## Architecture Understanding

### Data Flow
```
Panel Creation (Frontend) → Database Storage → Query Execution (Backend) → Data Processing → Visualization Rendering (Frontend)
```

### Key Components
1. **Frontend Visualization Components** - React components untuk rendering
2. **Backend Data Processing** - Logic untuk format data sesuai tipe panel
3. **Panel Type Registry** - Mapping tipe panel ke component
4. **Form Configuration** - UI untuk setup panel options

---

## Step-by-Step Guide

### 1. Frontend: Create Visualization Component

**Location:** `frontend/msti-automation/src/components/visualizations/`

```tsx
// NewVisualizationType.tsx
import React, { useEffect, useState } from 'react';
import metricService from '../../services/metricService';

interface NewVisualizationProps {
  panelId?: string;
  data?: Record<string, any>;
  queryResult?: Record<string, any>;
  options?: {
    // Define your specific options here
    unit?: string;
    decimals?: number;
    customOption?: string;
  };
}

const NewVisualization: React.FC<NewVisualizationProps> = ({ 
  panelId, 
  data, 
  queryResult, 
  options = {} 
}) => {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data extraction logic
  const extractValueFromResponse = (response: any): any => {
    // Implement your data extraction logic
    // Consider different response formats from backend
  };

  // API data fetching
  useEffect(() => {
    const fetchData = async () => {
      if (!panelId) return;

      try {
        setLoading(true);
        const response = await metricService.executePanelQuery(panelId);
        const extractedValue = extractValueFromResponse(response);
        setValue(extractedValue);
        setError(null);
      } catch (err) {
        setError('Failed to fetch data');
        setValue(null);
      } finally {
        setLoading(false);
      }
    };

    if (panelId) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [panelId]);

  // Fallback for data prop
  useEffect(() => {
    if (!panelId && (data || queryResult)) {
      // Process provided data
      setLoading(false);
    }
  }, [data, queryResult, panelId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-gray-50 h-full">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-red-50 h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Main rendering
  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-blue-50 h-full">
      {/* Your visualization implementation */}
    </div>
  );
};

export default NewVisualization;
```

### 2. Frontend: Register Component in Index

**Location:** `frontend/msti-automation/src/components/visualizations/index.ts`

```typescript
// Add import
export { default as NewVisualization } from './NewVisualization';

// Add to enum
export enum VisualizationType {
  // ... existing types
  NEW_VISUALIZATION = 'new-visualization',
}

// Add to components registry
export const VISUALIZATION_COMPONENTS = {
  // ... existing components
  [VisualizationType.NEW_VISUALIZATION]: NewVisualization,
} as const;

// Add to type mapping
const typeMapping: Record<string, keyof typeof VISUALIZATION_COMPONENTS> = {
  // ... existing mappings
  'new-visualization': VisualizationType.NEW_VISUALIZATION,
  'newvisualization': VisualizationType.NEW_VISUALIZATION, // Alternative naming
};
```

### 3. Frontend: Update Panel Form

**Location:** `frontend/msti-automation/src/pages/dashboard/PanelForm.tsx`

```typescript
// Update interface
interface PanelData {
  // ...
  type: 'timeseries' | 'interface-status' | 'gauge' | 'table' | 'new-visualization';
  // ...
}

// Add to select options in JSX
<select>
  {/* ... existing options */}
  <option value="new-visualization">New Visualization Type</option>
</select>

// Add specific configuration section
{panelData.type === 'new-visualization' && (
  <div className="space-y-4">
    <div>
      <label>Custom Option</label>
      <input
        name="options.customOption"
        value={panelData.options.customOption}
        onChange={handleOptionsChange}
      />
    </div>
  </div>
)}
```

### 4. Frontend: Update VisualizationPanel Logic

**Location:** `frontend/msti-automation/src/components/VisualizationPanel.tsx`

```typescript
// Update conditional logic for prop passing
{panel.type === 'interface-status' || 
 panel.type === 'interface' || 
 panel.type === 'gauge' || 
 panel.type === 'memory-usage' ||
 panel.type === 'new-visualization' ? (
  <VisualizationComponent
    panelId={panel.id}
    queryResult={data}
    options={panel.options || {}}
  />
) : (
  <VisualizationComponent
    data={data}
    options={panel.options || {}}
  />
)}
```

### 5. Frontend: Add Query Templates

**Location:** `frontend/msti-automation/src/components/QueryTemplateGenerator.tsx`

```typescript
// Add templates for your visualization type
const QUERY_TEMPLATES = {
  // ... existing templates
  'new-visualization': [
    {
      name: 'Basic New Visualization',
      description: 'Template for new visualization type',
      template: `from(bucket: "telegraf")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "your_measurement")
  |> filter(fn: (r) => r["_field"] == "your_field")
  |> last()
  |> yield(name: "result")`,
      panelType: 'new-visualization',
      category: 'custom'
    }
  ]
};
```

### 6. Backend: Update Panel Query Logic

**Location:** `backend/src/controllers/visualizationController.js`

```javascript
// In executePanelQuery function, add your panel type handling
if (panel.type === 'interface-status' || panel.type === 'interface') {
  // Interface handling (existing)
} else if (panel.type === 'new-visualization') {
  // Custom handling for your visualization type
  try {
    const result = await metricService.executeFluxQuery(queryApi, query.query);
    
    // Custom data processing if needed
    const processedResult = {
      state: "Done",
      series: [{
        name: "Custom Data",
        refId: query.refId,
        meta: { executedQueryString: query.query },
        fields: [
          {
            name: "Time",
            type: "time",
            values: result.series[0].fields[0].values,
            config: { unit: "time" }
          },
          {
            name: "CustomValue",
            type: "number|string",
            values: result.series[0].fields[1].values,
            config: { unit: options.unit || "" }
          }
        ],
        length: result.series[0].length
      }]
    };

    return {
      refId: query.refId,
      result: processedResult
    };
  } catch (queryError) {
    console.error('Error executing new visualization query:', queryError);
    throw queryError;
  }
} else {
  // Generic handling (existing)
}
```

---

## Critical Considerations

### 1. Data Format Consistency
- **Interface panels** need UP/DOWN string conversion
- **Numeric panels** (gauge, etc.) need raw numbers preserved
- **Custom panels** may need specific data transformations

### 2. Backend-Frontend Data Contract
```javascript
// Standard response format
{
  refId: "A",
  result: {
    state: "Done",
    series: [{
      name: "Data Series Name",
      refId: "A",
      meta: { executedQueryString: "..." },
      fields: [
        {
          name: "Time",
          type: "time",
          values: [timestamps...],
          config: { unit: "time" }
        },
        {
          name: "Value",
          type: "number|string",
          values: [data...],
          config: { unit: "%" }
        }
      ],
      length: dataLength
    }]
  }
}
```

### 3. Props Interface Standards
```typescript
interface VisualizationProps {
  panelId?: string;          // For API data fetching
  data?: Record<string, any>; // Fallback data prop
  queryResult?: Record<string, any>; // Alternative data prop
  options?: {                // Panel configuration
    unit?: string;
    decimals?: number;
    // ... custom options
  };
}
```

### 4. Error Handling Patterns
- Always implement loading, error, and success states
- Use consistent error messaging
- Provide fallback UI for missing data
- Log errors with descriptive context

### 5. Performance Considerations
- Implement auto-refresh intervals (30-60 seconds)
- Use React.memo for expensive renders
- Clean up intervals on unmount
- Handle large datasets efficiently

---

## Testing Checklist

### Frontend Testing
- [ ] Component renders without errors
- [ ] Loading state displays correctly
- [ ] Error state handles gracefully
- [ ] Data extraction works with different response formats
- [ ] Props interface is correctly defined
- [ ] Auto-refresh functionality works
- [ ] Panel options are configurable in form

### Backend Testing
- [ ] Panel type detection works correctly
- [ ] Data processing preserves required format
- [ ] Query execution doesn't break existing panels
- [ ] Error handling provides useful feedback
- [ ] Response format matches frontend expectations

### Integration Testing
- [ ] Panel creation workflow works end-to-end
- [ ] Query validation works with new templates
- [ ] Dashboard displays new panel type correctly
- [ ] Panel editing preserves configuration
- [ ] Auto-refresh doesn't cause memory leaks

---

## Common Pitfalls & Solutions

### 1. Data Format Mismatch
**Problem:** Frontend expects different data structure than backend provides
**Solution:** Always log response data and implement robust data extraction logic

### 2. Panel Type Detection
**Problem:** New panel type not recognized in conditional logic
**Solution:** Update all conditional checks in VisualizationPanel and backend

### 3. Props Interface Inconsistency
**Problem:** Some panels use `data`, others use `queryResult`, others use `panelId`
**Solution:** Support all three patterns for backward compatibility

### 4. Auto-refresh Conflicts
**Problem:** Multiple intervals running simultaneously
**Solution:** Always clean up intervals in useEffect cleanup

### 5. Error Boundary Issues
**Problem:** Component crashes break entire dashboard
**Solution:** Implement ErrorBoundary wrapper and graceful error handling

---

## Best Practices

1. **Follow Existing Patterns:** Study gauge and interface implementations
2. **Consistent Naming:** Use kebab-case for panel types
3. **Comprehensive Logging:** Add emoji-based logging for easy debugging
4. **Responsive Design:** Use consistent padding and sizing
5. **Background Colors:** Use light background colors for visual consistency
6. **Error Messages:** Provide clear, actionable error messages
7. **Performance:** Minimize re-renders and API calls
8. **Documentation:** Update this guide when you find new patterns

---

## Debugging Tips

### Frontend
```javascript
// Add comprehensive logging
console.log('🚀 Component mounting with props:', props);
console.log('📡 API response:', response);
console.log('📊 Extracted data:', extractedData);
console.log('✅ Final state:', finalState);
```

### Backend
```javascript
// Log panel type and processing
console.log('ExecutePanelQuery - Panel type:', panel.type);
console.log('Raw query results:', rows);
console.log('Processed result:', processedResult);
```

### Browser DevTools
- Check Network tab for API response format
- Use React DevTools for component state inspection
- Monitor Console for error messages and data flow

---

## Example: Memory Usage Gauge Implementation

Gauge implementation adalah contoh yang baik karena melibatkan:
- Chart.js integration untuk visual
- Numeric data preservation dari backend
- Custom options untuk min/max/unit
- Auto-refresh dengan proper cleanup
- Error handling yang comprehensive

Lessons learned dari gauge implementation:
1. Backend harus preserve tipe data asli (angka tetap angka)
2. Frontend harus robust dalam data extraction
3. Panel type mapping harus konsisten di semua tempat
4. Layout harus konsisten dengan komponen lain (padding, background, etc.)

---

*Last Updated: Based on gauge visualization implementation experience* 