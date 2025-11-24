import { useRef, useEffect, useState } from 'react';
import { QueryResult } from '../../store/dashboardStore';

interface TableProps {
  data: Record<string, QueryResult>;
  options: {
    showHeader?: boolean;
    pageSize?: number;
    fontSize?: string;
    sortable?: boolean;
    mode?: 'simplified' | 'advanced'; // Table mode
    selectedFields?: string[]; // For simplified mode
    [key: string]: any;
  };
}

interface Column {
  field: string;
  header: string;
}

interface RowData {
  [key: string]: any;
}

const TableVisualization = ({ data, options }: TableProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Default options
  const showHeader = options.showHeader !== false;
  const pageSize = options.pageSize || 10;
  const fontSize = options.fontSize || 'text-sm';
  const sortable = options.sortable !== false;
  const mode = options.mode || 'simplified';
  const selectedFields = options.selectedFields || [];
  
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;
    
    let allColumns: Column[] = [];
    let allRows: RowData[] = [];
    
    // Safety check: ensure data exists and is not null/undefined
    if (!data || typeof data !== 'object') {
      console.warn('Table component: data is null or undefined');
      setColumns([]);
      setRows([]);
      return;
    }

    // Process data based on mode
    if (mode === 'simplified') {
      // Simplified mode: single query result with field filtering
      processSimplifiedMode(data, selectedFields, allColumns, allRows);
    } else {
      // Advanced mode: multiple queries combined
      processAdvancedMode(data, allColumns, allRows);
    }
    
    setColumns(allColumns);
    setRows(allRows);
  }, [data, mode, selectedFields]);

  // Process simplified mode: filter fields from single query and create single row (pivot)
  const processSimplifiedMode = (
    data: Record<string, QueryResult>,
    selectedFields: string[],
    allColumns: Column[],
    allRows: RowData[]
  ) => {
    // Collect all field data first
    const fieldDataMap: Record<string, any> = {};
    
    Object.entries(data).forEach(([, queryResult]) => {
      if (!queryResult || !queryResult.series || !Array.isArray(queryResult.series)) {
        console.warn('Table simplified mode: queryResult or series is null/undefined', queryResult);
        return;
      }
      
      queryResult.series.forEach(serie => {
        if (!serie || !Array.isArray(serie.fields)) {
          console.warn('Table simplified mode: serie or fields is null/undefined', serie);
          return;
        }

        // There are two possible formats coming from backend:
        // 1) fields: Array<{name,type,values: any[]}> (Grafana-style)
        // 2) fields: string[] and data: Array<Record<string, any>> (store-style)

        const fieldsAny = serie.fields as any[];
        const isFieldObjects = (arr: any[]): arr is Array<{ name: string; type?: string; values?: any[] }> => {
          return Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'name' in arr[0];
        };

        if (isFieldObjects(fieldsAny)) {
          // Format with fields having values arrays
          const valueFields = fieldsAny.filter((f: any) => f.type !== 'time');
          
          valueFields.forEach((field: any) => {
            if (field.values && field.values.length > 0) {
              const lastIndex = field.values.length - 1;
              fieldDataMap[field.name] = field.values[lastIndex];
            }
          });
        } else {
          // fields are simple string names; serie.data contains rows
          const lastRow = Array.isArray(serie.data) && serie.data.length > 0 ? serie.data[serie.data.length - 1] : null;
          if (lastRow && typeof lastRow === 'object' && lastRow !== null) {
            Object.keys(lastRow).forEach(key => {
              if (key !== '_time' && key !== 'Time') {
                fieldDataMap[key] = lastRow[key];
              }
            });
          }
        }
      });
    });

    // Determine which fields to show, preserving order from selectedFields
    const availableFields = Object.keys(fieldDataMap);
    const fieldsToShow = selectedFields.length > 0
      ? selectedFields.filter(f => availableFields.includes(f)) // Preserve selectedFields order
      : availableFields;

    // Add columns in the correct order
    fieldsToShow.forEach(fieldName => {
      allColumns.push({
        field: fieldName,
        header: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      });
    });

    // Create single row with all field data
    if (fieldsToShow.length > 0) {
      const row: RowData = { _id: 'row-0' };
      fieldsToShow.forEach(fieldName => {
        row[fieldName] = fieldDataMap[fieldName] ?? null;
      });
      allRows.push(row);
    }
  };

  // Process advanced mode: combine multiple query results
  const processAdvancedMode = (
    data: Record<string, QueryResult>,
    allColumns: Column[],
    allRows: RowData[]
  ) => {
    let rowIndex = 0;
    const combinedData: { [key: string]: any } = {};

    // First pass: collect all data from all queries
    Object.entries(data).forEach(([refId, queryResult]) => {
      if (!queryResult || !queryResult.series || !Array.isArray(queryResult.series)) {
        console.warn('Table advanced mode: queryResult or series is null/undefined', queryResult);
        return;
      }

      queryResult.series.forEach(serie => {
        if (!serie || !Array.isArray(serie.fields)) {
          console.warn('Table advanced mode: serie or fields is null/undefined', serie);
          return;
        }
        const fieldsAny = serie.fields as any[];
        const isFieldObjects = (arr: any[]): arr is Array<{ name: string; type?: string; values?: any[] }> => {
          return Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'name' in arr[0];
        };

        if (isFieldObjects(fieldsAny)) {
          const valueField = fieldsAny.find((f: any) => f.type !== 'time') || fieldsAny[0];
          if (valueField && valueField.values && valueField.values.length > 0) {
            const columnName = valueField.name || refId;
            if (!allColumns.some(col => col.field === columnName)) {
              allColumns.push({ field: columnName, header: columnName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) });
            }
            const lastIndex = valueField.values.length - 1;
            combinedData[columnName] = valueField.values[lastIndex];
          }
        } else {
          // fields are strings; use serie.data last row
          const fieldNames: string[] = Array.isArray(fieldsAny) ? fieldsAny.filter((f: any) => f !== '_time' && f !== 'Time') : [];
          const fieldName = fieldNames[0] || serie.name || refId;
          const lastRow = Array.isArray(serie.data) && serie.data.length > 0 ? serie.data[serie.data.length - 1] : null;
          if (lastRow) {
            let value = null;
            if (typeof lastRow === 'object' && lastRow !== null) {
              value = lastRow[fieldName] ?? lastRow._value ?? null;
            }
            const columnName = fieldName || serie.name || refId;
            if (!allColumns.some(col => col.field === columnName)) {
              allColumns.push({ field: columnName, header: columnName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) });
            }
            combinedData[columnName] = value;
          }
        }
      });
    });

    // Second pass: create row from combined data
    if (Object.keys(combinedData).length > 0) {
      const row: RowData = { _id: `row-${rowIndex++}`, ...combinedData };
      allRows.push(row);
    }
  };
  
  // Format cell value based on its type
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return value.toFixed(options.decimals || 2);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };
  
  // Handle column sorting
  const handleSort = (field: string) => {
    if (!sortable) return;
    
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Get sorted and paginated rows
  const getVisibleRows = () => {
    // Apply sorting
    let visibleRows = [...rows];
    
    if (sortField) {
      visibleRows.sort((a, b) => {
        // Handle null values
        if (a[sortField] === null) return sortDirection === 'asc' ? -1 : 1;
        if (b[sortField] === null) return sortDirection === 'asc' ? 1 : -1;
        
        // Compare values
        if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
        if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Apply pagination
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return visibleRows.slice(startIndex, endIndex);
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(rows.length / pageSize);
  
  // Handle page navigation
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };
  
  // Render empty state if no data
  if (!data || Object.keys(data).length === 0 || rows.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 text-gray-500">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="w-full h-full overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        {showHeader && (
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  scope="col"
                  className={`px-6 py-3 text-left ${fontSize} font-medium text-gray-500 uppercase tracking-wider ${
                    sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => sortable && handleSort(column.field)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {sortField === column.field && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        
        <tbody className="bg-white divide-y divide-gray-200">
          {getVisibleRows().map((row) => (
            <tr key={row._id} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={`${row._id}-${column.field}`} className={`px-6 py-4 whitespace-nowrap ${fontSize}`}>
                  {formatCellValue(row[column.field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{currentPage * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min((currentPage + 1) * pageSize, rows.length)}
                </span>{' '}
                of <span className="font-medium">{rows.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  &laquo; Previous
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const pageNum = i;
                  return (
                    <button
                      key={i}
                      onClick={() => goToPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === pageNum ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next &raquo;
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableVisualization; 