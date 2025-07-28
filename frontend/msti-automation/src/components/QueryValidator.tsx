import React, { useState } from 'react';
import metricService from '../services/metricService';

export interface QueryValidationResult {
  isValid: boolean;
  error?: string;
  data?: any;
}

interface QueryValidatorProps {
  dataSourceId: string;
  query: string;
  onValidationResult?: (result: QueryValidationResult) => void;
  onQueryChange?: (modifiedQuery: string) => void;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  panelType?: string;
}

// Mapping variabel Grafana ke nilai standar
const GRAFANA_VARIABLE_MAPPING: Record<string, string> = {
  'v.timeRangeStart': '-1h',      // Default 1 jam ke belakang
  'v.timeRangeStop': 'now()',     // Sampai sekarang
  'v.windowPeriod': '1m',         // Window 1 menit
  '$__timeRange': '-1h',
  '$__interval': '1m',
  '$timeRange': '-1h',
  '$interval': '1m'
};

const QueryValidator: React.FC<QueryValidatorProps> = ({
  dataSourceId,
  query,
  onValidationResult,
  onQueryChange,
  className = '',
  disabled = false,
  showPreview = true,
  panelType = 'timeseries'
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<QueryValidationResult | null>(null);
  const [showPreviewData, setShowPreviewData] = useState(false);
  const [showGrafanaWarning, setShowGrafanaWarning] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Function untuk detect dan replace variabel Grafana
  const parseGrafanaVariables = (inputQuery: string): { modifiedQuery: string; hasUnknownVariables: boolean; unknownVariables: string[] } => {
    let modifiedQuery = inputQuery;
    const unknownVariables: string[] = [];

    // Detect semua variabel yang dimulai dengan v. atau $
    const variablePattern = /(v\.\w+|\$\w+|\$__\w+)/g;

    // Replace variabel yang dikenal
    Object.entries(GRAFANA_VARIABLE_MAPPING).forEach(([grafanaVar, replacement]) => {
      const regex = new RegExp(grafanaVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      modifiedQuery = modifiedQuery.replace(regex, replacement);
    });

    // Cek apakah masih ada variabel yang tidak ter-replace
    const remainingVariables = modifiedQuery.match(variablePattern) || [];
    unknownVariables.push(...remainingVariables);

    return {
      modifiedQuery,
      hasUnknownVariables: unknownVariables.length > 0,
      unknownVariables
    };
  };

  const validateQuery = async () => {
    if (!dataSourceId || !query.trim()) {
      const result: QueryValidationResult = {
        isValid: false,
        error: 'Data source dan query tidak boleh kosong'
      };
      setValidationResult(result);
      onValidationResult?.(result);
      return;
    }

    // Parse variabel Grafana
    const { modifiedQuery, hasUnknownVariables, unknownVariables } = parseGrafanaVariables(query);

    // Jika ada variabel yang tidak dikenal, tampilkan warning
    if (hasUnknownVariables) {
      setDetectedVariables(unknownVariables);
      setShowGrafanaWarning(true);
      return;
    }

    // Jika query berubah karena parsing, update parent component
    if (modifiedQuery !== query && onQueryChange) {
      onQueryChange(modifiedQuery);
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Step 1: Validate query syntax
      const validationResult = await metricService.validateFluxQuery(dataSourceId, modifiedQuery);
      
      if (!validationResult.isValid) {
        setValidationResult(validationResult);
        onValidationResult?.(validationResult);
        setIsValidating(false);
        return;
      }

      // Step 2: If validation successful, try to execute query for preview data
      let previewData = validationResult.data;
      
      try {
        // For gauge and other panel types that need actual data, execute the query
        if (showPreview && (panelType === 'gauge' || panelType === 'timeseries')) {
          console.log('🔍 Attempting to execute query for preview data...');
          console.log('📋 Query to execute:', modifiedQuery);
          console.log('🎯 DataSource ID:', dataSourceId);
          console.log('🎨 Panel Type:', panelType);
          
          const executeResult = await metricService.executeFluxQuery(dataSourceId, modifiedQuery);
          console.log('✅ Query execution SUCCESS! Result:', executeResult);
          console.log('📊 Result type:', typeof executeResult);
          console.log('📊 Result length (if array):', Array.isArray(executeResult) ? executeResult.length : 'Not array');
          
          if (executeResult && executeResult.length > 0) {
            previewData = executeResult;
            console.log('🎯 Using executeResult as previewData');
          } else {
            console.log('⚠️ ExecuteResult is empty, keeping validation data');
          }
        } else {
          console.log('⏭️ Skipping query execution - showPreview:', showPreview, 'panelType:', panelType);
        }
      } catch (executeError: any) {
        console.error('❌ Failed to execute query for preview:', executeError);
        console.error('❌ Error message:', executeError.message);
        console.error('❌ Error response:', executeError.response?.data);
        console.error('❌ Error stack:', executeError.stack);
        // Continue with validation result, just no preview data
        console.log('⚠️ Continuing with validation data instead');
      }

      const finalResult: QueryValidationResult = {
        isValid: true,
        data: previewData
      };
      
      setValidationResult(finalResult);
      onValidationResult?.(finalResult);
      
      if (finalResult.isValid && finalResult.data && showPreview) {
        setShowPreviewData(true);
      }
    } catch (error: any) {
      const result: QueryValidationResult = {
        isValid: false,
        error: error.message || 'Gagal memvalidasi query'
      };
      setValidationResult(result);
      onValidationResult?.(result);
    } finally {
      setIsValidating(false);
    }
  };

  const handleForceValidation = () => {
    setShowGrafanaWarning(false);
    setDetectedVariables([]);
    
    // Force validation tanpa replace variabel
    setIsValidating(true);
    setValidationResult(null);

    metricService.validateFluxQuery(dataSourceId, query)
      .then(result => {
        setValidationResult(result);
        onValidationResult?.(result);
        
        if (result.isValid && result.data && showPreview) {
          setShowPreviewData(true);
        }
      })
      .catch((error: any) => {
        const result: QueryValidationResult = {
          isValid: false,
          error: error.message || 'Gagal memvalidasi query'
        };
        setValidationResult(result);
        onValidationResult?.(result);
      })
      .finally(() => {
        setIsValidating(false);
      });
  };

  const renderGrafanaWarningModal = () => {
    if (!showGrafanaWarning) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">Variabel Grafana Terdeteksi</h3>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Query menggunakan variabel Grafana yang tidak didukung dalam sistem ini:
            </p>
            <div className="bg-gray-50 p-3 rounded border">
              {detectedVariables.map((variable, index) => (
                <code key={index} className="block text-sm font-mono text-red-600">
                  {variable}
                </code>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Silakan hapus atau ganti dengan nilai statis, atau klik "Lanjutkan Tetap" untuk mencoba validasi.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowGrafanaWarning(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleForceValidation}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
            >
              Lanjutkan Tetap
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewData = () => {
    if (!validationResult?.data || !showPreviewData) return null;

    // Render preview berdasarkan tipe panel
    switch (panelType) {
      case 'gauge':
        // Untuk gauge, extract nilai dari struktur data yang benar
        let gaugeValue: any = 'N/A';
        let timestamp: string | null = null;
        
        try {
          // Debug: log data structure yang diterima
          console.log('🔍 QueryValidator gauge data:', validationResult.data);
          console.log('🔍 Data type:', typeof validationResult.data);
          console.log('🔍 Is array:', Array.isArray(validationResult.data));
          
          // ADDED: Deep inspection of the exact structure
          if (validationResult.data) {
            console.log('🔍 Data keys:', Object.keys(validationResult.data));
            if (validationResult.data.series) {
              console.log('🔍 Series length:', validationResult.data.series.length);
              console.log('🔍 First series:', validationResult.data.series[0]);
              if (validationResult.data.series[0]?.fields) {
                console.log('🔍 Fields in first series:', validationResult.data.series[0].fields);
                validationResult.data.series[0].fields.forEach((field: any, idx: number) => {
                  console.log(`🔍 Field ${idx}:`, {
                    name: field.name,
                    type: field.type,
                    values: field.values ? `${field.values.length} values, first: ${field.values[0]}` : 'no values'
                  });
                });
              }
            }
          }
          
          // Check berbagai kemungkinan struktur data response
          if (validationResult.data) {
            // Struktur 1: Array dari executeFluxQuery (format standard InfluxDB response)
            if (Array.isArray(validationResult.data) && validationResult.data.length > 0) {
              console.log('🎯 Processing array format data...');
              const firstResult = validationResult.data[0];
              console.log('🎯 First result:', firstResult);
              
              // Check jika result memiliki series
              if (firstResult.result && firstResult.result.series && Array.isArray(firstResult.result.series)) {
                console.log('🎯 Found series in result.series');
                const series = firstResult.result.series[0];
                if (series && series.fields && Array.isArray(series.fields)) {
                  console.log('🎯 Processing fields:', series.fields);
                  // Cari field yang mengandung nilai numerik
                  const valueField = series.fields.find((f: any) => 
                    f.name === "Value" || f.name === "_value" || f.name === "avg" || 
                    f.name.includes("value") || f.name.includes("last")
                  );
                  
                  const timeField = series.fields.find((f: any) => 
                    f.name === "Time" || f.name === "_time" || f.name.includes("time")
                  );
                  
                  console.log('🎯 Value field found:', valueField);
                  console.log('🎯 Time field found:', timeField);
                  
                  if (valueField && valueField.values && valueField.values.length > 0) {
                    const latestValue = valueField.values[valueField.values.length - 1];
                    console.log('🎯 Latest value from field:', latestValue);
                    const numValue = typeof latestValue === 'string' ? parseFloat(latestValue) : latestValue;
                    if (!isNaN(numValue)) {
                      gaugeValue = numValue;
                      console.log('✅ Extracted gauge value:', gaugeValue);
                    }
                  }
                  
                  if (timeField && timeField.values && timeField.values.length > 0) {
                    timestamp = timeField.values[timeField.values.length - 1];
                  }
                }
              }
              // Check untuk array objek langsung (flat structure)
              else if (firstResult._value !== undefined || firstResult.value !== undefined) {
                console.log('🎯 Processing flat structure...');
                const numValue = firstResult._value !== undefined ? 
                  (typeof firstResult._value === 'string' ? parseFloat(firstResult._value) : firstResult._value) :
                  (typeof firstResult.value === 'string' ? parseFloat(firstResult.value) : firstResult.value);
                
                console.log('🎯 Flat value found:', numValue);
                if (!isNaN(numValue)) {
                  gaugeValue = numValue;
                  console.log('✅ Extracted gauge value from flat structure:', gaugeValue);
                }
                
                if (firstResult._time) {
                  timestamp = firstResult._time;
                } else if (firstResult.time) {
                  timestamp = firstResult.time;
                }
              }
              // Check untuk struktur yang memiliki data points langsung
              else if (Array.isArray(firstResult) && firstResult.length > 0) {
                console.log('🎯 Processing array of data points...');
                const dataPoint = firstResult[firstResult.length - 1]; // Latest data point
                console.log('🎯 Latest data point:', dataPoint);
                
                if (dataPoint && typeof dataPoint === 'object') {
                  // Check common InfluxDB field names
                  const possibleValueFields = ['_value', 'value', 'avg', 'last', 'mean'];
                  for (const fieldName of possibleValueFields) {
                    if (dataPoint[fieldName] !== undefined) {
                      const numValue = typeof dataPoint[fieldName] === 'string' ? parseFloat(dataPoint[fieldName]) : dataPoint[fieldName];
                      if (!isNaN(numValue)) {
                        gaugeValue = numValue;
                        console.log(`✅ Extracted gauge value from ${fieldName}:`, gaugeValue);
                        break;
                      }
                    }
                  }
                  
                  if (dataPoint._time || dataPoint.time) {
                    timestamp = dataPoint._time || dataPoint.time;
                  }
                }
              }
            }
            // Struktur 2: NEW FORMAT - Direct series dari backend baru (KEMUNGKINAN FORMAT BARU)
            else if (validationResult.data.series && Array.isArray(validationResult.data.series) && validationResult.data.series.length > 0) {
              console.log('🎯 Processing NEW backend format - response.data.series...');
              const series = validationResult.data.series[0];
              console.log('🎯 Series data:', series);
              
              if (series.fields && Array.isArray(series.fields)) {
                console.log('🎯 Processing fields in new format:', series.fields);
                
                // Cari field yang mengandung nilai numerik dengan name matching
                const valueField = series.fields.find((f: any) => 
                  f.name === "avg" || f.name === "_value" || f.name === "Value" || 
                  f.name.includes("value") || f.name.includes("last") || f.name.includes("mean")
                );
                
                const timeField = series.fields.find((f: any) => 
                  f.name === "Time" || f.name === "_time" || f.name.includes("time")
                );
                
                console.log('🎯 NEW FORMAT - Value field found:', valueField);
                console.log('🎯 NEW FORMAT - Time field found:', timeField);
                
                if (valueField && valueField.values && valueField.values.length > 0) {
                  const latestValue = valueField.values[valueField.values.length - 1];
                  console.log('🎯 NEW FORMAT - Latest value from field:', latestValue);
                  const numValue = typeof latestValue === 'string' ? parseFloat(latestValue) : latestValue;
                  if (!isNaN(numValue)) {
                    gaugeValue = numValue;
                    console.log('✅ NEW FORMAT - Extracted gauge value:', gaugeValue);
                  }
                }
                
                if (timeField && timeField.values && timeField.values.length > 0) {
                  timestamp = timeField.values[timeField.values.length - 1];
                  console.log('🎯 NEW FORMAT - Extracted timestamp:', timestamp);
                }
              }
            }
            // Struktur 3: Direct value (fallback)
            else if (typeof validationResult.data.value !== 'undefined') {
              console.log('🎯 Processing direct value...');
              const numValue = typeof validationResult.data.value === 'string' ? parseFloat(validationResult.data.value) : validationResult.data.value;
              if (!isNaN(numValue)) {
                gaugeValue = numValue;
                console.log('✅ Extracted gauge value from direct value:', gaugeValue);
              }
            }
            // Struktur 4: Direct number
            else if (typeof validationResult.data === 'number') {
              gaugeValue = validationResult.data;
              console.log('✅ Extracted gauge value from direct number:', gaugeValue);
            }
            // Struktur 5: Response hanya berisi metadata (status: "Done")
            else if (validationResult.data.status === "Done" && validationResult.data.time) {
              console.log('⚠️ Only metadata received, no actual data');
              // Ini berarti query valid tapi validation endpoint tidak mengembalikan data aktual
              // Kita tampilkan pesan bahwa query valid tapi preview tidak tersedia
              gaugeValue = "Query Valid";
              timestamp = validationResult.data.time;
            }
            // Struktur 6: Status DOWN/UP (interface-like but shouldn't be here)
            else if (validationResult.data.status && (validationResult.data.status === "UP" || validationResult.data.status === "DOWN")) {
              console.log('❌ Received interface status instead of numeric data:', validationResult.data.status);
              gaugeValue = `Wrong Data Type: ${validationResult.data.status}`;
              timestamp = validationResult.data.time;
            }
            else {
              console.log('❌ Unknown data structure');
              console.log('❌ Available keys:', Object.keys(validationResult.data));
              console.log('❌ First few characters of stringified data:', JSON.stringify(validationResult.data).substring(0, 200));
            }
          }
        } catch (error) {
          console.error('❌ Error extracting gauge value:', error);
          gaugeValue = 'Error';
        }
        
        return (
          <div className="mt-4 p-4 bg-gray-50 border rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">Preview Data (Gauge):</h4>
              <button
                type="button"
                onClick={() => setShowPreviewData(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {gaugeValue === "Query Valid" ? (
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 mb-2">
                    ✅ Query Valid
                  </div>
                  <div className="text-sm text-gray-600">
                    Preview data tidak tersedia melalui validation endpoint.
                    <br />
                    Data aktual akan tersedia setelah panel disimpan.
                  </div>
                </div>
              ) : typeof gaugeValue === 'string' && gaugeValue.startsWith('Wrong Data Type') ? (
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 mb-2">
                    ❌ Data Type Mismatch
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Query mengembalikan status interface ({gaugeValue.split(': ')[1]}) 
                    <br />
                    bukan nilai numerik untuk gauge.
                  </div>
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    💡 Tip: Pastikan query menggunakan field numerik seperti "_value" atau "avg"
                    <br />
                    dan bukan field status interface.
                  </div>
                </div>
              ) : (
                <div className="text-3xl font-bold text-blue-600">
                  {typeof gaugeValue === 'number' ? gaugeValue.toFixed(2) : gaugeValue}
                  {typeof gaugeValue === 'number' && '%'}
                </div>
              )}
              {timestamp && (
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(timestamp).toLocaleString()}
                </div>
              )}
              {/* Debug info - hapus ini setelah testing */}
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer">Debug Info (Klik untuk expand)</summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(validationResult.data, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        );

      case 'interface':
        const { status, time, metadata } = validationResult.data;
        return (
          <div className="mt-4 p-4 bg-gray-50 border rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">Preview Data:</h4>
              <button
                type="button"
                onClick={() => setShowPreviewData(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <div className={`text-2xl font-bold ${
                status === 'UP' ? 'text-green-600' : 
                status === 'DOWN' ? 'text-red-600' : 
                'text-gray-400'
              }`}>
                Status: {status}
              </div>
              {time && (
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(time).toLocaleString()}
                </div>
              )}
              {metadata && (
                <div className="text-sm">
                  <div><span className="font-medium">Interface:</span> {metadata.interface}</div>
                  <div><span className="font-medium">Source:</span> {metadata.source}</div>
                </div>
              )}
            </div>
          </div>
        );

      case 'chord-diagram':
        // Untuk chord diagram, extract source dan destination data
        let chordConnections: Array<{from: string, to: string}> = [];
        let chordTimestamp: string | null = null;
        
        try {
          console.log('🎯 QueryValidator chord diagram data:', validationResult.data);
          
          // Extract data dari berbagai kemungkinan struktur response
          if (validationResult.data) {
            // Struktur 1: Array dari executeFluxQuery
            if (Array.isArray(validationResult.data) && validationResult.data.length > 0) {
              const firstResult = validationResult.data[0];
              
              if (firstResult.result && firstResult.result.series && Array.isArray(firstResult.result.series)) {
                const series = firstResult.result.series[0];
                if (series && series.fields && Array.isArray(series.fields)) {
                  // FIXED: Untuk netflow data, source ada di labels, dst ada di field values
                  const dstField = series.fields.find((f: any) => f.name === "dst" || f.name === "_value" || f.name === "value");
                  const timeField = series.fields.find((f: any) => f.name === "Time" || f.name === "_time");
                  
                  console.log('🔗 Chord fields found:', { dstField: !!dstField, timeField: !!timeField });
                  console.log('🔗 Series labels:', series.fields[0]?.labels);
                  
                  if (dstField && dstField.values && dstField.values.length > 0) {
                    // Source dari labels (jika ada)
                    const sourceFromLabels = dstField.labels?.source || series.fields[0]?.labels?.source;
                    
                    console.log('🔗 Source from labels:', sourceFromLabels);
                    console.log('🔗 Destination values:', dstField.values);
                    
                    if (sourceFromLabels) {
                      // Create connections dari 1 source ke multiple destinations
                      const uniqueDestinations = [...new Set(dstField.values)]; // Remove duplicates
                      
                      uniqueDestinations.forEach(destination => {
                        if (destination && destination !== sourceFromLabels) {
                          chordConnections.push({
                            from: String(sourceFromLabels),
                            to: String(destination)
                          });
                        }
                      });
                    } else {
                      // Fallback: treat each value as separate connection
                      const maxConnections = Math.min(dstField.values.length, 10);
                      for (let i = 0; i < maxConnections; i++) {
                        const destination = dstField.values[i];
                        if (destination) {
                          chordConnections.push({
                            from: `Node_${i}`,
                            to: String(destination)
                          });
                        }
                      }
                    }
                    
                    if (timeField && timeField.values && timeField.values.length > 0) {
                      chordTimestamp = timeField.values[timeField.values.length - 1];
                    }
                  }
                }
              }
            }
            // Struktur 2: Direct series format
            else if (validationResult.data.series && Array.isArray(validationResult.data.series)) {
              const series = validationResult.data.series[0];
              if (series && series.fields && Array.isArray(series.fields)) {
                const dstField = series.fields.find((f: any) => f.name === "dst" || f.name === "_value" || f.name === "value");
                
                if (dstField && dstField.values && dstField.values.length > 0) {
                  const sourceFromLabels = dstField.labels?.source || series.fields[0]?.labels?.source;
                  
                  if (sourceFromLabels) {
                    const uniqueDestinations = [...new Set(dstField.values)];
                    uniqueDestinations.forEach(destination => {
                      if (destination && destination !== sourceFromLabels) {
                        chordConnections.push({
                          from: String(sourceFromLabels),
                          to: String(destination)
                        });
                      }
                    });
                  }
                }
              }
            }
          }
          
          console.log('✅ Extracted chord connections:', chordConnections);
        } catch (error) {
          console.error('❌ Error extracting chord data:', error);
        }
        
        return (
          <div className="mt-4 p-4 bg-gray-50 border rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">Preview Data (Chord Diagram):</h4>
              <button
                type="button"
                onClick={() => setShowPreviewData(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {chordConnections.length > 0 ? (
                <>
                  <div className="text-lg font-bold text-blue-600 mb-2">
                    🔗 {chordConnections.length} Network Connections Found
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {chordConnections.map((connection, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                        <span className="font-medium text-green-600">{connection.from}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-blue-600">{connection.to}</span>
                      </div>
                    ))}
                  </div>
                  {chordTimestamp && (
                    <div className="text-sm text-gray-500">
                      Last updated: {new Date(chordTimestamp).toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600 mb-2">
                    ⚠️ No Connection Data Found
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Query valid tetapi tidak menemukan data source dan destination.
                    <br />
                    Pastikan query mengandung field "source" dan "_value" (atau "dst").
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    💡 Tip: Gunakan template "Network Flow" untuk query yang sesuai
                  </div>
                </div>
              )}
              {/* Debug info */}
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer">Debug Info (Klik untuk expand)</summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(validationResult.data, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        );

      case 'timeseries':
      case 'table':
      default:
        return (
          <div className="mt-4 p-4 bg-gray-50 border rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">Preview Data:</h4>
              <button
                type="button"
                onClick={() => setShowPreviewData(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <pre className="text-xs text-gray-600 bg-white p-2 rounded border max-h-40 overflow-auto">
              {JSON.stringify(validationResult.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      {/* Validation Button */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={validateQuery}
          disabled={disabled || isValidating || !dataSourceId || !query.trim()}
          className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
            disabled || !dataSourceId || !query.trim()
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {isValidating ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Memvalidasi...
            </div>
          ) : (
            'Validasi Query'
          )}
        </button>
      </div>

      
      {validationResult && (
        <div className={`p-3 rounded-md border ${
          validationResult.isValid 
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {validationResult.isValid ? (
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium">
              {validationResult.isValid ? 'Query valid!' : 'Query tidak valid'}
            </span>
          </div>
          {validationResult.error && (
            <div className="mt-1 text-sm">
              {validationResult.error}
            </div>
          )}
        </div>
      )}

      {/* Preview Data */}
      {renderPreviewData()}

      {/* Grafana Warning Modal */}
      {renderGrafanaWarningModal()}
    </div>
  );
};

export default QueryValidator; 