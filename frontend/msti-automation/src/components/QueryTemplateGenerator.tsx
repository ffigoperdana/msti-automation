import React from 'react';

export interface QueryTemplate {
  name: string;
  description: string;
  template: string;
  panelType: string;
  category: 'basic' | 'network' | 'system' | 'custom';
}

// Query templates berdasarkan standar Grafana dan use case yang umum
export const QUERY_TEMPLATES: Record<string, QueryTemplate[]> = {
  'timeseries': [
    {
      name: 'CPU Usage',
      description: 'Monitor CPU usage over time',
      template: `from(bucket: "\${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "cpu")
  |> filter(fn: (r) => r["_field"] == "usage_idle")
  |> map(fn: (r) => ({ r with _value: 100.0 - r._value }))
  |> aggregateWindow(every: 10s, fn: mean)
  |> yield(name: "cpu_usage")`,
      panelType: 'timeseries',
      category: 'system'
    },
    {
      name: 'Memory Usage',
      description: 'Monitor memory usage over time',
      template: `from(bucket: "\${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "mem")
  |> filter(fn: (r) => r["_field"] == "used_percent")
  |> aggregateWindow(every: 10s, fn: mean)
  |> yield(name: "memory_usage")`,
      panelType: 'timeseries',
      category: 'system'
    },
    {
      name: 'Network Traffic',
      description: 'Monitor network interface traffic',
      template: `from(bucket: "\${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "net")
  |> filter(fn: (r) => r["_field"] == "bytes_recv" or r["_field"] == "bytes_sent")
  |> derivative(unit: 1s, nonNegative: true)
  |> aggregateWindow(every: 10s, fn: mean)
  |> yield(name: "network_traffic")`,
      panelType: 'timeseries',
      category: 'network'
    }
  ],
  'interface-status': [
    {
      name: 'Interface Status',
      description: 'Monitor network interface up/down status',
      template: `from(bucket: "\${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "sys/intf")
  |> filter(fn: (r) => r["dn"] == "\${interface_dn}")
  |> filter(fn: (r) => r["_field"] == "operSt")
  |> filter(fn: (r) => r["source"] == "\${source}")
  |> last()
  |> yield(name: "interface_status")`,
      panelType: 'interface-status',
      category: 'network'
    },
    {
      name: 'Port Status Check',
      description: 'Check specific port operational status',
      template: `from(bucket: "\${bucket}")
  |> range(start: -1m)
  |> filter(fn: (r) => r["_measurement"] == "interface")
  |> filter(fn: (r) => r["interface"] == "\${interface_name}")
  |> filter(fn: (r) => r["_field"] == "admin_status" or r["_field"] == "oper_status")
  |> last()
  |> yield(name: "port_status")`,
      panelType: 'interface-status',
      category: 'network'
    }
  ],
  'gauge': [
    {
      name: 'Current CPU Usage',
      description: 'Show current CPU usage as gauge',
      template: `from(bucket: "\${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "cpu")
  |> filter(fn: (r) => r["_field"] == "usage_idle")
  |> map(fn: (r) => ({ r with _value: 100.0 - r._value }))
  |> last()
  |> yield(name: "current_cpu")`,
      panelType: 'gauge',
      category: 'system'
    },
    {
      name: 'Disk Usage Percentage',
      description: 'Show current disk usage percentage',
      template: `from(bucket: "\${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "disk")
  |> filter(fn: (r) => r["_field"] == "used_percent")
  |> filter(fn: (r) => r["path"] == "/")
  |> last()
  |> yield(name: "disk_usage")`,
      panelType: 'gauge',
      category: 'system'
    },
    {
      name: 'Memory Usage (LEAF-1)',
      description: 'Memory usage untuk LEAF-1 dengan time range 1 jam',
      template: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "sys/procsys/sysmem/sysmemusage")
  |> filter(fn: (r) => r["_field"] == "avg")
  |> filter(fn: (r) => r["source"] == "LEAF-1")
  |> aggregateWindow(every: 1m, fn: last, createEmpty: false)
  |> yield(name: "memory_usage")`,
      panelType: 'gauge',
      category: 'system'
    },
    {
      name: 'Memory Usage (LEAF-2)',
      description: 'Memory usage untuk LEAF-2 dengan time range 1 jam',
      template: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "sys/procsys/sysmem/sysmemusage")
  |> filter(fn: (r) => r["_field"] == "avg")
  |> filter(fn: (r) => r["source"] == "LEAF-2")
  |> aggregateWindow(every: 1m, fn: last, createEmpty: false)
  |> yield(name: "memory_usage")`,
      panelType: 'gauge',
      category: 'system'
    },
    {
      name: 'Temperature Sensor',
      description: 'Monitor temperature from sensor',
      template: `from(bucket: "\${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "temperature")
  |> filter(fn: (r) => r["sensor"] == "\${sensor_name}")
  |> filter(fn: (r) => r["_field"] == "value")
  |> last()
  |> yield(name: "temperature")`,
      panelType: 'gauge',
      category: 'system'
    }
  ],
  'table': [
    {
      name: 'Interface Statistics',
      description: 'Show interface statistics in table format',
      template: `from(bucket: "\${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "interface")
  |> filter(fn: (r) => r["_field"] == "bytes_recv" or r["_field"] == "bytes_sent" or r["_field"] == "packets_recv" or r["_field"] == "packets_sent")
  |> last()
  |> pivot(rowKey: ["interface"], columnKey: ["_field"], valueColumn: "_value")
  |> yield(name: "interface_stats")`,
      panelType: 'table',
      category: 'network'
    },
    {
      name: 'System Overview',
      description: 'Show system metrics in table format',
      template: `from(bucket: "\${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "system")
  |> filter(fn: (r) => r["_field"] == "uptime" or r["_field"] == "n_cpus" or r["_field"] == "load1")
  |> last()
  |> pivot(rowKey: ["host"], columnKey: ["_field"], valueColumn: "_value")
  |> yield(name: "system_overview")`,
      panelType: 'table',
      category: 'system'
    }
  ],
  'chord-diagram': [
    {
      name: 'Network Flow (Source to IP)',
      description: 'Show network flow connections from source to destination IP',
      template: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "dst")
  |> filter(fn: (r) => r["source"] == "192.168.238.101")
  |> aggregateWindow(every: 5m, fn: last, createEmpty: false)
  |> yield(name: "netflow")`,
      panelType: 'chord-diagram',
      category: 'network'
    },
    {
      name: 'Traffic Flow Analysis',
      description: 'Analyze traffic flow patterns between network nodes',
      template: `from(bucket: "telegraf")
  |> range(start: -30m)
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "dst")
  |> filter(fn: (r) => r["host"] == "big")
  |> group(columns: ["source", "_value"])
  |> aggregateWindow(every: 1m, fn: count, createEmpty: false)
  |> yield(name: "traffic_flow")`,
      panelType: 'chord-diagram',
      category: 'network'
    },
    {
      name: 'Connection Matrix',
      description: 'Display connection relationships in network topology',
      template: `from(bucket: "telegraf")
  |> range(start: -15m)
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "dst")
  |> last()
  |> yield(name: "connections")`,
      panelType: 'chord-diagram',
      category: 'network'
    }
  ]
};

// Variabel yang umum digunakan dalam template
export const TEMPLATE_VARIABLES = {
  bucket: {
    description: 'InfluxDB bucket name',
    example: 'telegraf',
    required: true
  },
  interface_dn: {
    description: 'Interface distinguished name',
    example: 'sys/intf/phys-[eth1/7]/phys',
    required: true
  },
  interface_name: {
    description: 'Interface name',
    example: 'eth0',
    required: true
  },
  source: {
    description: 'Source device name',
    example: 'LEAF-1',
    required: true
  },
  sensor_name: {
    description: 'Temperature sensor name',
    example: 'cpu_temp',
    required: false
  }
};

interface QueryTemplateGeneratorProps {
  panelType: string;
  onTemplateSelect: (template: string) => void;
  className?: string;
}

const QueryTemplateGenerator: React.FC<QueryTemplateGeneratorProps> = ({
  panelType,
  onTemplateSelect,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [showVariableHelp, setShowVariableHelp] = React.useState(false);

  const templates = QUERY_TEMPLATES[panelType] || [];
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const applyTemplate = (template: QueryTemplate) => {
    onTemplateSelect(template.template);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'all': 'Semua',
      'basic': 'Dasar',
      'network': 'Network',
      'system': 'Sistem',
      'custom': 'Custom'
    };
    return labels[category] || category;
  };

  if (templates.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Tidak ada template tersedia untuk tipe panel ini.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Query Templates</h4>
          <button
            type="button"
            onClick={() => setShowVariableHelp(!showVariableHelp)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showVariableHelp ? 'Sembunyikan' : 'Bantuan Variabel'}
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-3">
          {categories.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        {/* Variable Help */}
        {showVariableHelp && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h5 className="text-sm font-medium text-blue-900 mb-2">Variabel Template:</h5>
            <div className="space-y-1 text-xs text-blue-800">
              {Object.entries(TEMPLATE_VARIABLES).map(([key, info]) => (
                <div key={key}>
                  <code className="font-mono bg-blue-100 px-1 rounded">${key}</code> - {info.description}
                  {info.example && <span className="text-blue-600"> (contoh: {info.example})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Template List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredTemplates.map((template, index) => (
          <div key={index} className="border rounded-md p-3 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">{template.name}</h5>
                <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    template.category === 'network' ? 'bg-blue-100 text-blue-800' :
                    template.category === 'system' ? 'bg-green-100 text-green-800' :
                    template.category === 'basic' ? 'bg-gray-100 text-gray-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {getCategoryLabel(template.category)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => applyTemplate(template)}
                className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Gunakan
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          Tidak ada template untuk kategori ini.
        </div>
      )}
    </div>
  );
};

export default QueryTemplateGenerator; 