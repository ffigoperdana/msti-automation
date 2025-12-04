import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL } from '../../../config';

interface ValidationResult {
  valid: boolean;
  output: string;
  message: string;
}

const TelegrafForm: React.FC = () => {
  const navigate = useNavigate();
  const { filename: urlFilename } = useParams<{ filename: string }>();
  const isEditMode = !!(urlFilename && urlFilename !== 'new');
  
  // Form state
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState('');

  // Load config in edit mode
  useEffect(() => {
    if (isEditMode && urlFilename) {
      loadConfig(urlFilename);
    }
  }, [isEditMode, urlFilename]);

  const loadConfig = async (configFilename: string) => {
    try {
      const response = await fetch(`${API_URL}/telegraf/configs/${configFilename}`);
      const data = await response.json();
      
      if (data.success) {
        setFilename(data.config.baseName.replace('.conf', ''));
        setContent(data.config.content);
        setEnabled(data.config.enabled);
      } else {
        setError('Failed to load configuration');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setError('Failed to load configuration');
    }
  };

  const handleValidate = async () => {
    if (!content.trim()) {
      setError('Config content cannot be empty');
      return;
    }

    try {
      setIsValidating(true);
      setValidationResult(null);
      setError('');

      // Create temp file for validation
      const tempFilename = `temp_validate_${Date.now()}.conf`;
      
      const response = await fetch(`${API_URL}/telegraf/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: tempFilename,
          content,
          enabled: false,
          validate: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create temp file');
      }

      // Validate the temp file
      const validateResponse = await fetch(`${API_URL}/telegraf/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: tempFilename })
      });

      const validateData = await validateResponse.json();
      setValidationResult(validateData);

      // Delete temp file
      await fetch(`${API_URL}/telegraf/configs/${tempFilename}`, {
        method: 'DELETE'
      });

    } catch (error) {
      console.error('Error validating config:', error);
      setError('Failed to validate configuration');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!filename.trim()) {
      setError('Filename is required');
      return;
    }

    if (!content.trim()) {
      setError('Config content is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const finalFilename = filename.endsWith('.conf') ? filename : `${filename}.conf`;
      
      let response;
      
      if (isEditMode && urlFilename) {
        // Update existing config
        response = await fetch(`${API_URL}/telegraf/configs/${urlFilename}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            enabled,
            validate: true
          })
        });
      } else {
        // Create new config
        response = await fetch(`${API_URL}/telegraf/configs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: finalFilename,
            content,
            enabled,
            validate: true
          })
        });
      }

      const data = await response.json();

      if (data.success) {
        alert('Configuration saved successfully!');
        navigate('/automation/telegraf');
      } else {
        if (data.validation) {
          setValidationResult(data.validation);
          setError(data.message || 'Configuration validation failed');
        } else {
          setError(data.message || 'Failed to save configuration');
        }
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setError('Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit' : 'New'} Telegraf Configuration
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Result */}
        {validationResult && (
          <div className={`border rounded-md p-4 ${
            validationResult.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              <svg 
                className={`h-5 w-5 ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {validationResult.valid ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  validationResult.valid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {validationResult.message}
                </h3>
                {validationResult.output && (
                  <pre className="mt-2 text-xs overflow-x-auto p-2 bg-white border rounded">
                    {validationResult.output}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filename Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filename <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={isEditMode}
              placeholder="cpu_metrics"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
            <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm">
              .conf
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Configuration filename (without .conf extension)
          </p>
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
            Enable this configuration
          </label>
        </div>

        {/* Config Content */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Configuration Content <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !content.trim()}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center"
            >
              {isValidating ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Validate Config
                </>
              )}
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            placeholder={`# Telegraf Configuration

# Example CPU Input Plugin
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false
  report_active = false

# Example InfluxDB Output
[[outputs.influxdb_v2]]
  urls = ["http://localhost:8086"]
  token = "your-token"
  organization = "your-org"
  bucket = "your-bucket"
`}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter your Telegraf configuration in TOML format
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/automation/telegraf')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TelegrafForm;
