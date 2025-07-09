import React, { useEffect, useState } from 'react';
import metricService from '../../services/metricService';

interface HostnameProps {
    panelId: string;
    queryResult?: any;
    options?: any;
}

interface Field {
    name: string;
    type: string;
    values: any[];
    config?: {
        unit: string;
    };
}

const Hostname: React.FC<HostnameProps> = ({ panelId }) => {
    const [hostname, setHostname] = useState<string>('UNKNOWN');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!panelId) return;

            try {
                setLoading(true);
                const response = await metricService.executePanelQuery(panelId);

                if (response?.[0]?.result?.series?.[0]?.fields) {
                    const fields = response[0].result.series[0].fields;

                    const nameField = fields.find((f: Field) =>
                        f.name.toLowerCase() === "name"
                    );
                    if (nameField && nameField.values && nameField.values.length > 0) {
                        const latestHostname = nameField.values[nameField.values.length - 1];
                        setHostname(latestHostname?.toString() || 'UNKNOWN');
                    } else {
                        setHostname('UNKNOWN');
                    }
                    setError(null);
                } else {
                    setHostname('UNKNOWN');
                    setError('No hostname data available');
                }
            } catch (err) {
                setError('Failed to fetch hostname');
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

    return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-blue-50">
            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="text-red-500">{error}</div>
            ) : (
                <>
                    <div className="text-4xl font-bold text-blue-700 break-all">
                        {hostname}
                    </div>
                </>
            )}
        </div>
    );
};

export default Hostname;