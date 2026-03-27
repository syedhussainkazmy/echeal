import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Heart, Thermometer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PageLoading } from '../../components/ui/PageLoading';

interface VitalAlert {
    type: string;
    severity: 'low' | 'high';
    value: number;
}

interface VitalWithAlerts {
    vital: {
        _id: string;
        bloodPressure: { systolic: number; diastolic: number };
        heartRate: number;
        bloodSugar?: number;
        weight?: number;
        temperature?: number;
        recordedAt: string;
    };
    alerts: VitalAlert[];
}

interface TrendsData {
    trends: {
        bloodPressure: { date: Date; systolic: number; diastolic: number }[];
        heartRate: { date: Date; value: number }[];
        bloodSugar: { date: Date; value: number }[];
        weight: { date: Date; value: number }[];
        temperature: { date: Date; value: number }[];
    };
    averages: {
        bloodPressure: { systolic: number; diastolic: number };
        heartRate: number;
        bloodSugar: number;
        weight: number;
        temperature: number;
    };
}

export default function PatientAnalytics() {
    const [vitalsData, setVitalsData] = useState<VitalWithAlerts[]>([]);
    const [trends, setTrends] = useState<TrendsData | null>(null);
    const [alertsSummary, setAlertsSummary] = useState<{ totalAlerts: number; alertCounts: Record<string, number> } | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [vitalsRes, trendsRes, alertsRes] = await Promise.all([
                    api.get('/analytics/vitals/alerts', { params: { limit: 10 } }),
                    api.get('/analytics/vitals/trends', { params: { days } }),
                    api.get('/analytics/vitals/alerts-summary', { params: { days: 7 } }),
                ]);
                setVitalsData(vitalsRes.data.vitals);
                setTrends(trendsRes.data);
                setAlertsSummary(alertsRes.data);
            } catch (e) {
                console.error('Error fetching analytics:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [days]);

    const getAlertColor = (severity: 'low' | 'high') => {
        return severity === 'high' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50';
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'bloodPressure':
            case 'heartRate':
                return <Heart className="h-4 w-4" />;
            case 'temperature':
                return <Thermometer className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    if (loading) return <PageLoading role="patient" />;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Health Analytics</h1>
                    <p className="text-gray-500 mt-1">Monitor your health trends and alerts</p>
                </div>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            {/* Alerts Summary */}
            {alertsSummary && alertsSummary.totalAlerts > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h2 className="text-base font-semibold text-red-800">
                            {alertsSummary.totalAlerts} Alert{alertsSummary.totalAlerts > 1 ? 's' : ''} This Week
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(alertsSummary.alertCounts).map(([key, count]) => {
                            const [type, severity] = key.split('_');
                            return (
                                <span
                                    key={key}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getAlertColor(severity as 'low' | 'high')}`}
                                >
                                    {getAlertIcon(type)}
                                    {type}: {count}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Averages Card */}
            {trends?.averages && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-md border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 mb-1">Avg BP Systolic</p>
                        <p className="text-xl font-bold text-gray-900">{trends.averages.bloodPressure.systolic || '-'}</p>
                    </div>
                    <div className="bg-white rounded-md border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 mb-1">Avg BP Diastolic</p>
                        <p className="text-xl font-bold text-gray-900">{trends.averages.bloodPressure.diastolic || '-'}</p>
                    </div>
                    <div className="bg-white rounded-md border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 mb-1">Avg Heart Rate</p>
                        <p className="text-xl font-bold text-gray-900">{trends.averages.heartRate || '-'}</p>
                    </div>
                    <div className="bg-white rounded-md border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 mb-1">Avg Blood Sugar</p>
                        <p className="text-xl font-bold text-gray-900">{trends.averages.bloodSugar || '-'}</p>
                    </div>
                    <div className="bg-white rounded-md border border-gray-100 p-4">
                        <p className="text-xs text-gray-500 mb-1">Avg Weight</p>
                        <p className="text-xl font-bold text-gray-900">{trends.averages.weight || '-'}</p>
                    </div>
                </div>
            )}

            {/* Blood Pressure Chart */}
            {trends?.trends?.bloodPressure?.length > 0 && (
                <div className="bg-white rounded-md border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-teal-600" />
                        <h2 className="text-base font-semibold text-gray-800">Blood Pressure Trend</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={trends.trends.bloodPressure.map((bp) => ({
                            date: format(new Date(bp.date), 'MMM d'),
                            systolic: bp.systolic,
                            diastolic: bp.diastolic,
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="systolic" stroke="#14b8a6" strokeWidth={2} dot={false} name="Systolic" />
                            <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={false} name="Diastolic" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Heart Rate Chart */}
            {trends?.trends?.heartRate?.length > 0 && (
                <div className="bg-white rounded-md border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Heart className="h-5 w-5 text-red-500" />
                        <h2 className="text-base font-semibold text-gray-800">Heart Rate Trend</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={trends.trends.heartRate.map((hr) => ({
                            date: format(new Date(hr.date), 'MMM d'),
                            value: hr.value,
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} name="Heart Rate" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Recent Vitals with Alerts */}
            <div className="bg-white rounded-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-800">Recent Readings with Alerts</h2>
                </div>
                {vitalsData.length === 0 ? (
                    <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No vitals recorded yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {vitalsData.map(({ vital, alerts }) => (
                            <div key={vital._id} className="px-6 py-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            BP: {vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic} mmHg
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Heart Rate: {vital.heartRate} bpm
                                            {vital.bloodSugar && ` | Blood Sugar: ${vital.bloodSugar} mg/dL`}
                                            {vital.temperature && ` | Temp: ${vital.temperature}°C`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">{format(new Date(vital.recordedAt), 'MMM d, yyyy HH:mm')}</p>
                                    </div>
                                </div>
                                {alerts.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {alerts.map((alert, idx) => (
                                            <span
                                                key={idx}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getAlertColor(alert.severity)}`}
                                            >
                                                {alert.severity === 'high' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {alert.type}: {alert.value} ({alert.severity})
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
