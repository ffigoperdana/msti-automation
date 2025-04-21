import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Format data untuk alert rule
interface AlertRuleForm {
  name: string;
  description: string;
  datasource: string;
  enabled: boolean;
  // Kondisi evaluasi
  evaluationType: 'threshold' | 'range' | 'nodata';
  operator: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte';
  threshold: number;
  evaluationFrequency: string;
  // Query
  query: string;
  // Severity dan notifikasi
  severity: 'critical' | 'warning' | 'info';
  contacts: string[];
  annotations: {
    summary: string;
    description: string;
  };
}

// Opsi untuk dropdown
const FREQUENCIES = [
  { value: '10s', label: '10 seconds' },
  { value: '30s', label: '30 seconds' },
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' }
];

const OPERATORS = [
  { value: 'gt', label: 'is above', symbol: '>' },
  { value: 'lt', label: 'is below', symbol: '<' },
  { value: 'eq', label: 'is equal to', symbol: '=' },
  { value: 'neq', label: 'is not equal to', symbol: '!=' },
  { value: 'gte', label: 'is above or equal to', symbol: '>=' },
  { value: 'lte', label: 'is below or equal to', symbol: '<=' }
];

const SEVERITIES = [
  { value: 'critical', label: 'Critical', color: 'red' },
  { value: 'warning', label: 'Warning', color: 'yellow' },
  { value: 'info', label: 'Info', color: 'blue' }
];

// Data dummy
const MOCK_DATASOURCES = [
  { id: '1', name: 'InfluxDB Dev', type: 'influxdb' },
  { id: '2', name: 'InfluxDB Production', type: 'influxdb' },
  { id: '3', name: 'InfluxDB Staging', type: 'influxdb' }
];

const MOCK_CONTACT_POINTS = [
  { id: '1', name: 'Admin Email', type: 'email' },
  { id: '2', name: 'DevOps Slack', type: 'slack' },
  { id: '3', name: 'System Webhook', type: 'webhook' }
];

// Data untuk edit mode
const MOCK_ALERT_RULES: Record<string, AlertRuleForm> = {
  '1': {
    name: 'High CPU Usage',
    description: 'Alerts when CPU usage is above 80% for more than 5 minutes',
    datasource: '1',
    enabled: true,
    evaluationType: 'threshold',
    operator: 'gt',
    threshold: 80,
    evaluationFrequency: '1m',
    query: 'from(bucket: "metrics")\n  |> range(start: -1h)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> mean()',
    severity: 'critical',
    contacts: ['1', '2'],
    annotations: {
      summary: 'High CPU Usage Detected',
      description: 'CPU usage is above 80% for {{$duration}}'
    }
  }
};

const AlertRuleForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // State awal form
  const [formData, setFormData] = useState<AlertRuleForm>({
    name: '',
    description: '',
    datasource: MOCK_DATASOURCES[0]?.id || '',
    enabled: true,
    evaluationType: 'threshold',
    operator: 'gt',
    threshold: 80,
    evaluationFrequency: '1m',
    query: 'from(bucket: "metrics")\n  |> range(start: -1h)\n  |> filter(fn: (r) => r._measurement == "cpu")\n  |> mean()',
    severity: 'critical',
    contacts: [],
    annotations: {
      summary: '',
      description: ''
    }
  });

  // State untuk validasi dan loading
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'success' | 'error'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load data untuk edit mode
  useEffect(() => {
    if (isEditMode && id && MOCK_ALERT_RULES[id]) {
      setFormData({ ...MOCK_ALERT_RULES[id] });
    }
  }, [isEditMode, id]);

  // Handler untuk perubahan input dasar
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else if (name === 'threshold') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handler untuk perubahan pada annotations
  const handleAnnotationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      annotations: {
        ...formData.annotations,
        [name]: value
      }
    });
  };

  // Handler untuk menambah/hapus contact point
  const handleContactChange = (contactId: string) => {
    if (formData.contacts.includes(contactId)) {
      // Hapus contact
      setFormData({
        ...formData,
        contacts: formData.contacts.filter(id => id !== contactId)
      });
    } else {
      // Tambah contact
      setFormData({
        ...formData,
        contacts: [...formData.contacts, contactId]
      });
    }
  };

  // Handler untuk validasi query
  const handleValidateQuery = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setValidationStatus('none');
    setValidationMessage('');

    // Simulasi API call
    setTimeout(() => {
      if (formData.query.includes('from(bucket:') && formData.query.includes('range(')) {
        setValidationStatus('success');
        setValidationMessage('Query is valid and returns time series data compatible with alerting');
      } else {
        setValidationStatus('error');
        setValidationMessage('Query syntax error or does not return time series data');
      }
      setIsValidating(false);
    }, 1500);
  };

  // Handler untuk submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulasi API call
    setTimeout(() => {
      console.log('Saving alert rule:', formData);
      setIsSaving(false);
      navigate('/alerting/rules');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Edit Alert Rule' : 'Create Alert Rule'}
        </h1>
        <p className="text-gray-600 mt-1">
          Configure alert rules to monitor your metrics and trigger notifications
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Alert Rule Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Alert Rule Details</h2>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="High CPU Usage"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describes the purpose of this alert rule"
            />
          </div>
          
          <div>
            <label htmlFor="datasource" className="block text-sm font-medium text-gray-700 mb-1">
              Data Source <span className="text-red-500">*</span>
            </label>
            <select
              id="datasource"
              name="datasource"
              value={formData.datasource}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Select a data source</option>
              {MOCK_DATASOURCES.map(ds => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.type})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="enabled" className="flex items-center">
              <input
                id="enabled"
                name="enabled"
                type="checkbox"
                checked={formData.enabled}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Enable this alert rule</span>
            </label>
          </div>
        </div>
        
        {/* Query Configuration */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Query Configuration</h2>
          
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
              Flux Query <span className="text-red-500">*</span>
            </label>
            <textarea
              id="query"
              name="query"
              value={formData.query}
              onChange={handleInputChange}
              required
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="from(bucket: &quot;metrics&quot;)
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == &quot;cpu&quot;)
  |> mean()"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleValidateQuery}
                disabled={isValidating}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center"
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </>
                ) : (
                  'Validate Query'
                )}
              </button>
            </div>
            
            {validationStatus !== 'none' && (
              <div className={`mt-2 p-3 rounded-md text-sm ${
                validationStatus === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {validationMessage}
              </div>
            )}
          </div>
        </div>
        
        {/* Alert Condition */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Alert Condition</h2>
          
          <div className="flex items-center gap-2 flex-wrap">
            <label className="block text-sm font-medium text-gray-700">Alert when value</label>
            
            <select
              name="operator"
              value={formData.operator}
              onChange={handleInputChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            
            <input
              name="threshold"
              type="number"
              value={formData.threshold}
              onChange={handleInputChange}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="evaluationFrequency" className="block text-sm font-medium text-gray-700 mb-1">
              Evaluation Frequency
            </label>
            <select
              id="evaluationFrequency"
              name="evaluationFrequency"
              value={formData.evaluationFrequency}
              onChange={handleInputChange}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {FREQUENCIES.map(freq => (
                <option key={freq.value} value={freq.value}>{freq.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              How often the alert rule will be evaluated
            </p>
          </div>
        </div>
        
        {/* Alert Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Alert Settings</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <div className="flex gap-3">
              {SEVERITIES.map(severity => (
                <label
                  key={severity.value}
                  className={`flex items-center p-3 border rounded-md cursor-pointer ${
                    formData.severity === severity.value 
                      ? `border-${severity.color}-500 bg-${severity.color}-50` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={severity.value}
                    checked={formData.severity === severity.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`w-3 h-3 rounded-full bg-${severity.color}-500 mr-2`}></div>
                  <span>{severity.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Contact Points <span className="text-red-500">*</span>
            </label>
            
            {MOCK_CONTACT_POINTS.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
                No contact points configured. <a href="/alerting/contacts/new" className="text-blue-500 hover:text-blue-700">Create a contact point</a> first.
              </div>
            ) : (
              <div className="space-y-2">
                {MOCK_CONTACT_POINTS.map(contact => (
                  <label key={contact.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.contacts.includes(contact.id)}
                      onChange={() => handleContactChange(contact.id)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{contact.name} ({contact.type})</span>
                  </label>
                ))}
                
                {formData.contacts.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    At least one contact point must be selected
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Notification Message */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">Notification Message</h2>
          
          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
              Summary <span className="text-red-500">*</span>
            </label>
            <input
              id="summary"
              name="summary"
              type="text"
              value={formData.annotations.summary}
              onChange={handleAnnotationChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="High CPU Usage Detected"
            />
            <p className="mt-1 text-xs text-gray-500">
              Brief summary of the alert. Will be used as notification title.
            </p>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.annotations.description}
              onChange={handleAnnotationChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="CPU usage is above {{threshold}} for {{$duration}}"
            />
            <p className="mt-1 text-xs text-gray-500">
              Detailed description of the alert. You can use variables like {'{{threshold}}'}, {'{{$value}}'}, {'{{$labels}}'}, etc.
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/alerting/rules')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || formData.contacts.length === 0}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Alert Rule'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AlertRuleForm; 