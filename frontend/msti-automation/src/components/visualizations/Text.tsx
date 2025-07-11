import React, { useEffect, useState } from 'react';
import metricService from '../../services/metricService';

interface TextProps {
    panelId: string;
}

interface Field {
    name: string;
    type: string;
    values: any[];
    config?: {
        unit: string;
    };
}

const Text: React.FC<TextProps> = ({ panelId }) => {
    const [text, setText] = useState<string>('UNKNOWN');
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
                    // Ambil field pertama yang bertipe string/text
                    const textField = fields.find(f => f.type === 'string' || f.type === 'name') || fields[0];
                    if (textField.values && textField.values.length > 0) {
                        const latestText = textField.values[textField.values.length - 1];
                        setText(latestText?.toString() || 'UNKNOWN');
                    } else {
                        setText('UNKNOWN');
                    }
                    setError(null);
                } else {
                    setText('UNKNOWN');
                    setError('No text data available');
                }
            } catch (err) {
                setError('Failed to fetch text');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
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
                <div className="text-4xl font-bold text-blue-700 break-all">
                    {text}
                </div>
            )}
        </div>
    );
};

export default Text;
