import { useRef, useEffect, useState } from 'react';
import { QueryResult } from '../../store/dashboardStore';

interface InterfaceProps {
  data: Record<string, QueryResult>;
  options: {
    deviceField?: string;
    nameField?: string;
    statusField?: string;
    speedField?: string;
    duplexField?: string;
    bytesInField?: string;
    bytesOutField?: string;
    errorsField?: string;
    [key: string]: any;
  };
}

// Komponen kartu interface
const InterfaceCard = ({ 
  name, 
  device, 
  status, 
  speed, 
  duplex, 
  bytesIn, 
  bytesOut, 
  errors 
}: { 
  name: string;
  device: string;
  status: string;
  speed?: string;
  duplex?: string;
  bytesIn?: string;
  bytesOut?: string;
  errors?: number;
}) => {
  // Helper untuk menentukan warna berdasarkan status
  const getStatusColor = (status: string) => {
    status = status.toLowerCase();
    if (status === 'up' || status === '1') return 'text-green-600 bg-green-100 border-green-500';
    if (status === 'down' || status === '0') return 'text-red-600 bg-red-100 border-red-500';
    return 'text-gray-600 bg-gray-100 border-gray-500';
  };

  // Format angka untuk bandwidth
  const formatBytes = (bytes?: string) => {
    if (!bytes) return '-';
    const num = parseFloat(bytes);
    if (isNaN(num)) return bytes;
    
    if (num < 1024) return `${num.toFixed(2)} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(2)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(2)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const statusColor = getStatusColor(status);
  const statusText = status.toLowerCase() === 'up' || status === '1' ? 'Up' : 
                     status.toLowerCase() === 'down' || status === '0' ? 'Down' : status;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${statusColor}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold text-gray-700">{device}</div>
          <div className="text-sm text-gray-500">{name}</div>
        </div>
        <div className={`px-2 py-1 rounded-full text-sm font-medium ${statusColor}`}>
          {statusText}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
        {speed && (
          <div>
            <span className="text-gray-500">Kecepatan:</span> {speed}
          </div>
        )}
        {duplex && (
          <div>
            <span className="text-gray-500">Duplex:</span> {duplex}
          </div>
        )}
        {bytesIn && (
          <div>
            <span className="text-gray-500">IN:</span> {formatBytes(bytesIn)}
          </div>
        )}
        {bytesOut && (
          <div>
            <span className="text-gray-500">OUT:</span> {formatBytes(bytesOut)}
          </div>
        )}
        {errors !== undefined && (
          <div>
            <span className="text-gray-500">Errors:</span> {errors}
          </div>
        )}
      </div>
    </div>
  );
};

const Interface = ({ data, options }: InterfaceProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interfaces, setInterfaces] = useState<Array<{
    id: string;
    name: string;
    device: string;
    status: string;
    speed?: string;
    duplex?: string;
    bytesIn?: string;
    bytesOut?: string;
    errors?: number;
  }>>([]);
  
  useEffect(() => {
    // Extract fields from options
    const deviceField = options.deviceField || 'device';
    const nameField = options.nameField || 'name';
    const statusField = options.statusField || 'status';
    const speedField = options.speedField;
    const duplexField = options.duplexField;
    const bytesInField = options.bytesInField;
    const bytesOutField = options.bytesOutField;
    const errorsField = options.errorsField;
    
    // Process data from query results
    const interfacesList: any[] = [];
    
    Object.entries(data).forEach(([refId, queryResult]) => {
      queryResult.series.forEach(serie => {
        serie.data.forEach(point => {
          // Find field indexes
          const nameIdx = serie.fields.indexOf(nameField);
          const deviceIdx = serie.fields.indexOf(deviceField);
          const statusIdx = serie.fields.indexOf(statusField);
          const speedIdx = speedField ? serie.fields.indexOf(speedField) : -1;
          const duplexIdx = duplexField ? serie.fields.indexOf(duplexField) : -1;
          const bytesInIdx = bytesInField ? serie.fields.indexOf(bytesInField) : -1;
          const bytesOutIdx = bytesOutField ? serie.fields.indexOf(bytesOutField) : -1;
          const errorsIdx = errorsField ? serie.fields.indexOf(errorsField) : -1;
          
          // If we have at least name, device and status, we can create an interface item
          if (nameIdx >= 0 && deviceIdx >= 0 && statusIdx >= 0) {
            const ifaceItem = {
              id: `${point[deviceIdx]}-${point[nameIdx]}`,
              name: point[nameIdx],
              device: point[deviceIdx],
              status: point[statusIdx],
              speed: speedIdx >= 0 ? point[speedIdx] : undefined,
              duplex: duplexIdx >= 0 ? point[duplexIdx] : undefined,
              bytesIn: bytesInIdx >= 0 ? point[bytesInIdx] : undefined,
              bytesOut: bytesOutIdx >= 0 ? point[bytesOutIdx] : undefined,
              errors: errorsIdx >= 0 ? point[errorsIdx] : undefined
            };
            
            // Only add if not already in the list
            const existingItem = interfacesList.find(item => item.id === ifaceItem.id);
            if (!existingItem) {
              interfacesList.push(ifaceItem);
            }
          }
        });
      });
    });
    
    setInterfaces(interfacesList);
  }, [data, options]);
  
  return (
    <div ref={containerRef} className="w-full h-full overflow-auto p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {interfaces.length > 0 ? (
          interfaces.map(iface => (
            <InterfaceCard 
              key={iface.id}
              name={iface.name}
              device={iface.device}
              status={iface.status}
              speed={iface.speed}
              duplex={iface.duplex}
              bytesIn={iface.bytesIn}
              bytesOut={iface.bytesOut}
              errors={iface.errors}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 p-4">
            Tidak ada data interface yang tersedia
          </div>
        )}
      </div>
    </div>
  );
};

export default Interface; 