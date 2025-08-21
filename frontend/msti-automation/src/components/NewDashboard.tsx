import React, { useState } from 'react';
import { useApi } from '../context/ApiContext';
import { visualizationService } from '../services/visualizationService';
import { FluxQueryResponse } from '../types/flux';

interface NewDashboardProps {
  dataSourceId: string;
}

interface QueryValidationResponse {
  status: string;
  data?: Array<{
    _time: string;
    _value: number | string;
  }>;
}

const NewDashboard: React.FC<NewDashboardProps> = ({ dataSourceId }) => {
  const { fetchApi, isLoading, error } = useApi();
  const [fluxQuery, setFluxQuery] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [queryResult, setQueryResult] = useState<FluxQueryResponse | null>(null);

  const handleValidateQuery = async () => {
    try {
      // Prepare query by replacing Grafana variables
      let processedQuery = fluxQuery
        .replace(/v\.timeRangeStart/g, '-1h')
        .replace(/v\.timeRangeStop/g, 'now()')
        .replace(/v\.windowPeriod/g, '10s');

      console.log('Validating query:', processedQuery);

      const response = await visualizationService.validateQuery(
        fetchApi,
        dataSourceId,
        processedQuery
      ) as QueryValidationResponse;

      console.log('Query validation response:', response);

      if (response && response.data) {
        setQueryResult({
          state: 'Done',
          series: [{
            name: 'Query Result', // Add missing name property
            fields: [
              { 
                name: 'time', 
                values: response.data.map(d => d._time),
                type: 'time'
              },
              { 
                name: 'value', 
                values: response.data.map(d => d._value),
                type: 'number'
              }
            ]
          }]
        });
        setValidationError('');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      setValidationError(error.message || 'Failed to validate query');
      setQueryResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <textarea
          value={fluxQuery}
          onChange={(e) => setFluxQuery(e.target.value)}
          placeholder="Enter your Flux query here"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          rows={8}
        />
      </div>

      <div>
        <button 
          onClick={handleValidateQuery}
          disabled={isLoading}
          className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isLoading 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Validating...' : 'Validate Query'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{validationError}</p>
        </div>
      )}

      {queryResult && queryResult.series && queryResult.series.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700">
            Query validated successfully! Got {queryResult.series[0].fields[0].values.length} data points.
          </p>
        </div>
      )}
    </div>
  );
};

export default NewDashboard; 