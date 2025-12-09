import React, { useEffect, useState } from 'react';
import metricService from '../../services/metricService';

interface StatProps {
    panelId?: string;
    queryResult?: any;
}

interface Field {
    name: string;
    type: string;
    values: any[];
    config?: {
        unit?: string;
    };
}

// Helper function to convert centiseconds to human-readable format
const convertCentisecondsToUptime = (centiseconds: number): string => {
    // Convert centiseconds to seconds (1 centisecond = 0.01 second)
    const totalSeconds = Math.floor(centiseconds / 100);
    
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    const parts: string[] = [];
    
    if (days > 0) {
        parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    }
    if (hours > 0) {
        parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0 || (days === 0 && hours === 0)) {
        parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    if (seconds > 0 && days === 0 && hours === 0) {
        parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
};

const Stat: React.FC<StatProps> = ({ panelId, queryResult }) => {
    const [, setValue] = useState<number | null>(null);
    const [displayValue, setDisplayValue] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUptime, setIsUptime] = useState<boolean>(false);

    // Function to process data from either API or queryResult prop
    const processData = (response: any) => {
        try {
            console.log('📊 Stat - Processing data:', JSON.stringify(response, null, 2));
            
            let fields: Field[] | undefined;
            
            // Handle queryResult prop (from VisualizationPanel)
            if (queryResult && Object.keys(queryResult).length > 0) {
                const firstQueryKey = Object.keys(queryResult)[0];
                fields = queryResult[firstQueryKey]?.series?.[0]?.fields;
                console.log('📊 Stat - Using queryResult, fields:', fields);
            } 
            // Handle direct API response
            else if (response?.[0]?.result?.series?.[0]?.fields) {
                fields = response[0].result.series[0].fields;
                console.log('📊 Stat - Using API response, fields:', fields);
            }
            
            if (fields && fields.length > 0) {
                console.log('📊 Stat - All fields:', fields);
                
                // PRIORITAS: Cari field value (bukan Time/timestamp)
                // 1. Skip semua field dengan name "Time" atau type "time"
                // 2. Ambil field pertama yang type-nya number/int/float/bigint
                const numberField = fields.find(f => {
                    const isTimeField = f.name === 'Time' || 
                                       f.type === 'time' || 
                                       f.name.toLowerCase().includes('timestamp') ||
                                       f.name === '_time';
                    
                    const isNumberType = ['number', 'int', 'float', 'bigint'].includes(f.type);
                    
                    console.log(`📊 Stat - Checking field "${f.name}": isTimeField=${isTimeField}, isNumberType=${isNumberType}`);
                    
                    return !isTimeField && isNumberType;
                });
                
                // Fallback: jika tidak ketemu, ambil field index 1 (biasanya value field)
                const selectedField = numberField || fields[1];
                
                console.log('📊 Stat - Selected field:', selectedField);

                console.log('📊 Stat - Selected field:', selectedField);

                if (selectedField && selectedField.values && selectedField.values.length > 0) {
                    const latestValue = Number(selectedField.values[selectedField.values.length - 1]);
                    const rawValue = isNaN(latestValue) ? null : latestValue;
                    setValue(rawValue);
                    
                    console.log('📊 Stat - Latest value:', rawValue);
                    console.log('📊 Stat - Field name:', selectedField.name);
                    console.log('📊 Stat - Field config:', selectedField.config);
                    
                    // Detect field type
                    const fieldName = selectedField.name?.toLowerCase() || '';
                    const fieldUnit = selectedField.config?.unit?.toLowerCase() || '';
                    
                    // Check if this is an interface status field (ifOperStatus, ifAdminStatus)
                    const isStatusField = fieldName.includes('ifoperstatus') || 
                                         fieldName.includes('ifadminstatus') ||
                                         fieldName.includes('status');
                    
                    // Check if this is uptime data (by field name or unit)
                    const isUptimeField = fieldName.includes('uptime') || 
                                        fieldName.includes('sysuptime') ||
                                        fieldUnit.includes('centisecond') || 
                                        fieldUnit === 'cs';
                    
                    console.log('📊 Stat - Is status field?', isStatusField);
                    console.log('📊 Stat - Is uptime field?', isUptimeField);
                    
                    setIsUptime(isUptimeField);
                    
                    if (isStatusField && rawValue !== null) {
                        // Convert SNMP status code to text
                        let statusText = 'UNKNOWN';
                        if (rawValue === 1) statusText = 'UP';
                        else if (rawValue === 2) statusText = 'DOWN';
                        else if (rawValue === 3) statusText = 'TESTING';
                        else if (rawValue === 5) statusText = 'DORMANT';
                        else if (rawValue === 6) statusText = 'NOT PRESENT';
                        else if (rawValue === 7) statusText = 'LOWER LAYER DOWN';
                        
                        console.log('📊 Stat - Converted status:', statusText);
                        setDisplayValue(statusText);
                        setUnit(''); // Clear unit for status display
                    } else if (isUptimeField && rawValue !== null) {
                        // Convert centiseconds to human-readable format
                        const converted = convertCentisecondsToUptime(rawValue);
                        console.log('📊 Stat - Converted uptime:', converted);
                        setDisplayValue(converted);
                        setUnit(''); // Clear unit for uptime display
                    } else {
                        // Regular number display
                        setDisplayValue(rawValue !== null ? rawValue.toLocaleString() : 'UNKNOWN');
                        setUnit(selectedField.config?.unit || '');
                    }
                } else {
                    setValue(null);
                    setDisplayValue('UNKNOWN');
                }
                setError(null);
            } else {
                console.log('📊 Stat - No fields found');
                setValue(null);
                setDisplayValue('UNKNOWN');
                setError('No numeric data available');
            }
        } catch (err: any) {
            console.error('📊 Stat - Error processing data:', err);
            setError(err.message || 'Failed to process data');
            setDisplayValue('ERROR');
        }
    };

    // Fetch data from API when panelId is provided
    useEffect(() => {
        const fetchData = async () => {
            if (!panelId) return;

            try {
                setLoading(true);
                const response = await metricService.executePanelQuery(panelId);
                console.log('📊 Stat - API response:', response);
                processData(response);
                processData(response);
                setError(null);
            } catch (err) {
                console.error('📊 Stat - Error fetching data:', err);
                setError('Failed to fetch stat');
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

    // Process queryResult when it changes
    useEffect(() => {
        if (queryResult && Object.keys(queryResult).length > 0) {
            console.log('📊 Stat - QueryResult changed:', queryResult);
            setLoading(true);
            processData(queryResult);
            setLoading(false);
        }
    }, [queryResult]);

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
                <div className={`font-bold text-green-700 break-all ${
                    isUptime ? 'text-3xl' : 'text-5xl'
                }`}>
                    {displayValue}
                    {unit && <span className="text-2xl font-normal ml-2">{unit}</span>}
                </div>
            )}
        </div>
    );
};

export default Stat;
