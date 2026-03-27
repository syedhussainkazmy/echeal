import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { AlertTriangle, Users, Calendar, Activity, TrendingUp, FileText, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { PageLoading } from '../../components/ui/PageLoading';

interface VitalAlert {
    type: string;
    severity: 'low' | 'high';
    value: number;
}

interface PatientWithAlerts {
    patient: {
        _id: string;
        user: { firstName: string; lastName: string; email: string };
        dateOfBirth?: string;
        bloodGroup?: string;
    };
    latestVital: {
        bloodPressure: { systolic: number; diastolic: number };
        heartRate: number;
        bloodSugar?: number;
        recordedAt: string;
    };
    alerts: VitalAlert[];
    recordedAt: string;
}

interface AppointmentStats {
    periodDays: number;
    totalAppointments: number;
    appointmentStats: Record<string, number>;
    prescriptionsCount: number;
    patientDistribution: { status: string; count: number }[];
    dailyAppointments: { _id: string; count: number }[];
}

export default function DoctorAnalytics() {
    const [patientsWithAlerts, setPatientsWithAlerts] = useState<PatientWithAlerts[]>([]);
    const [appointmentStats, setAppointmentStats] = useState<AppointmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [alertsRes, analyticsRes] = await Promise.all([
                    api.get('/analytics/patients/alerts'),
                    api.get('/analytics/doctor', { params: { days } }),
                ]);
                setPatientsWithAlerts(alertsRes.data.data);
                setAppointmentStats(analyticsRes.data);
            } catch (e) {
                console.error('Error fetching doctor analytics:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [days]);

    const getAlertColor = (severity: 'low' | 'high') => {
        return severity === 'high' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50';
    };

    if (loading) return <PageLoading role="doctor" />;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-500 mt-1">Monitor patient health and your practice</p>
                </div>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            {/* Patients with Critical Alerts */}
            <div className="bg-white rounded-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-red-50">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h2 className="text-base font-semibold text-red-800">Patients with Critical Alerts</h2>
                    </div>
                </div>
                {patientsWithAlerts.length === 0 ? (
                    <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No patients with critical alerts</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {patientsWithAlerts.map((item) => (
                            <div key={item.patient._id} className="px-6 py-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {item.patient.user.firstName} {item.patient.user.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            BP: {item.latestVital.bloodPressure.systolic}/{item.latestVital.bloodPressure.diastolic} mmHg |
                                            HR: {item.latestVital.heartRate} bpm
                                            {item.latestVital.bloodSugar && ` | BS: ${item.latestVital.bloodSugar} mg/dL`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">{format(new Date(item.recordedAt), 'MMM d, yyyy HH:mm')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {item.alerts.map((alert, idx) => (
                                        <span
                                            key={idx}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getAlertColor(alert.severity)}`}
                                        >
                                            {alert.type}: {alert.value} ({alert.severity})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Appointment Statistics */}
            {appointmentStats && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-md border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <p className="text-xs text-gray-500">Total Appointments</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{appointmentStats.totalAppointments}</p>
                        </div>
                        <div className="bg-white rounded-md border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-5 w-5 text-green-600" />
                                <p className="text-xs text-gray-500">Confirmed</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{appointmentStats.appointmentStats.confirmed || 0}</p>
                        </div>
                        <div className="bg-white rounded-md border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-purple-600" />
                                <p className="text-xs text-gray-500">Prescriptions</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{appointmentStats.prescriptionsCount}</p>
                        </div>
                        <div className="bg-white rounded-md border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-5 w-5 text-teal-600" />
                                <p className="text-xs text-gray-500">Completed</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{appointmentStats.appointmentStats.completed || 0}</p>
                        </div>
                    </div>

                    {/* Daily Appointments Chart */}
                    {appointmentStats.dailyAppointments.length > 0 && (
                        <div className="bg-white rounded-md border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                <h2 className="text-base font-semibold text-gray-800">Daily Appointments ({days} days)</h2>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={appointmentStats.dailyAppointments.map((d) => ({
                                    date: d._id,
                                    count: d.count,
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Appointments" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
