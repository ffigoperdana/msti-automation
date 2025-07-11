import React, { useEffect, useState } from 'react';
import metricService from '../../services/metricService';

interface StatProps {
    panelId: string;
}

interface Field {
    name: string;
    type: string;
    values: any[];
    config?: {
        unit?: string;
    };
}

const Stat: React.FC<StatProps> = ({ panelId }) => {
    const [value, setValue] = useState<number | null>(null);
    const [unit, setUnit] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!panelId) return;

            try {
                setLoading(true);
                const response = await metricService.executePanelQuery(panelId);

                const fields: Field[] | undefined = response?.[0]?.result?.series?.[0]?.fields;
                if (fields && fields.length > 0) {
                    // Cari field dengan tipe number/int/float/bigint
                    const numberField = fields.find(f =>
                        ['number', 'int', 'float', 'bigint'].includes(f.type)
                    ) || fields[0];

                    if (numberField.values && numberField.values.length > 0) {
                        const latestValue = Number(numberField.values[numberField.values.length - 1]);
                        setValue(isNaN(latestValue) ? null : latestValue);
                        setUnit(numberField.config?.unit || '');
                    } else {
                        setValue(null);
                    }
                    setError(null);
                } else {
                    setValue(null);
                    setError('No numeric data available');
                }
            } catch (err) {
                setError('Failed to fetch stat');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [panelId]);

    return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-green-50">
            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="text-red-500">{error}</div>
            ) : (
                <div className="text-5xl font-bold text-green-700 break-all">
                    {value !== null ? value.toLocaleString() : 'UNKNOWN'}
                    {unit && <span className="text-2xl font-normal ml-2">{unit}</span>}
                </div>
            )}
        </div>
    );
};

export default Stat;
