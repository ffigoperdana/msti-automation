import { useRef, useEffect, useState } from 'react';
import { QueryResult } from '../../store/dashboardStore';

interface TableProps {
  data: Record<string, QueryResult>;
  options: {
    showHeader?: boolean;
    pageSize?: number;
    fontSize?: string;
    sortable?: boolean;
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
  
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;
    
    let allColumns: Column[] = [];
    let allRows: RowData[] = [];
    let rowIndex = 0;
    
    // Process data from query results
    // Safety check: ensure data exists and is not null/undefined
    if (!data || typeof data !== 'object') {
      console.warn('Table component: data is null or undefined');
      setColumns([]);
      setRows([]);
      return;
    }
    
    Object.entries(data).forEach(([, queryResult]) => {
      // Safety check: ensure queryResult exists and has series
      if (!queryResult || !queryResult.series || !Array.isArray(queryResult.series)) {
        console.warn('Table component: queryResult or series is null/undefined', queryResult);
        return;
      }
      
      queryResult.series.forEach(serie => {
        // Safety check: ensure serie exists and has data
        if (!serie || !serie.data || !Array.isArray(serie.data) || !serie.fields || !Array.isArray(serie.fields)) {
          console.warn('Table component: serie, serie.data, or serie.fields is null/undefined', serie);
          return;
        }
        // Extract columns from fields
        const serieColumns = serie.fields.map(field => ({
          field,
          header: field
        }));
        
        // Add time column if not already present
        if (!serieColumns.some(col => col.field === '_time')) {
          serieColumns.unshift({
            field: '_time',
            header: 'Time'
          });
        }
        
        // Ensure we don't add duplicate columns
        serieColumns.forEach(col => {
          if (!allColumns.some(existingCol => existingCol.field === col.field)) {
            allColumns.push(col);
          }
        });
        
        // Convert data points to rows
        serie.data.forEach(point => {
          const row: RowData = { _id: `row-${rowIndex++}` };
          
          // Add time field
          if (point.time) {
            row['_time'] = formatTimestamp(point.time);
          }
          
          // Add all other fields
          serie.fields.forEach((field, index) => {
            if (typeof point[field] !== 'undefined') {
              row[field] = point[field];
            } else if (Array.isArray(point) && typeof point[index] !== 'undefined') {
              // Handle case where data is array-like
              row[field] = point[index];
            }
          });
          
          // Add measurements/tags as columns
          if (serie.tags) {
            Object.entries(serie.tags).forEach(([tagKey, tagValue]) => {
              row[tagKey] = tagValue;
              
              // Add tag column if not already present
              if (!allColumns.some(col => col.field === tagKey)) {
                allColumns.push({
                  field: tagKey,
                  header: tagKey
                });
              }
            });
          }
          
          allRows.push(row);
        });
      });
    });
    
    setColumns(allColumns);
    setRows(allRows);
  }, [data]);
  
  // Format timestamp into readable format
  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
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