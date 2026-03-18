import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { HeartPulse, CalendarDays, Activity, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';

interface Vital {
    _id: string;
    bloodPressure: { systolic: number; diastolic: number };
    heartRate: number;
    recordedAt: string;
}

interface Appointment {
    _id: string;
    doctor: { firstName: string; lastName: string };
    appointmentDate: string;
    status: string;
    reasonForVisit: string;
}

interface DashboardData {
    profile: any;
    recentVitals: Vital[];
    upcomingAppointments: Appointment[];
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function PatientDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/patient/dashboard').then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {data?.profile?.user?.firstName} 👋
                </h1>
                <p className="text-gray-500 mt-1">Here's your health overview</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-teal-50 rounded-lg p-3"><HeartPulse className="h-6 w-6 text-teal-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Blood Group</p>
                        <p className="text-xl font-bold text-gray-900">{data?.profile?.bloodGroup || '—'}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-blue-50 rounded-lg p-3"><Activity className="h-6 w-6 text-blue-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Last Heart Rate</p>
                        <p className="text-xl font-bold text-gray-900">
                            {data?.recentVitals?.[0]?.heartRate ? `${data.recentVitals[0].heartRate} bpm` : '—'}
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-purple-50 rounded-lg p-3"><CalendarDays className="h-6 w-6 text-purple-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Upcoming Appointments</p>
                        <p className="text-xl font-bold text-gray-900">{data?.upcomingAppointments?.length ?? 0}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Appointments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Upcoming Appointments</h2>
                        <Link to="/patient/appointments" className="text-sm text-teal-600 hover:text-teal-800 font-medium">View all →</Link>
                    </div>
                    {data?.upcomingAppointments?.length === 0 ? (
                        <div className="text-center py-10">
                            <Stethoscope className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No upcoming appointments</p>
                            <Link to="/patient/appointments" className="mt-3 inline-block text-sm bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                                Book Now
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.upcomingAppointments?.map((appt) => (
                                <div key={appt._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">Dr. {appt.doctor.firstName} {appt.doctor.lastName}</p>
                                        <p className="text-xs text-gray-500">{appt.reasonForVisit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-700">{format(new Date(appt.appointmentDate), 'MMM d, yyyy')}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[appt.status]}`}>{appt.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Vitals */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Recent Vitals</h2>
                        <Link to="/patient/vitals" className="text-sm text-teal-600 hover:text-teal-800 font-medium">View all →</Link>
                    </div>
                    {data?.recentVitals?.length === 0 ? (
                        <div className="text-center py-10">
                            <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No vitals recorded yet</p>
                            <Link to="/patient/vitals" className="mt-3 inline-block text-sm bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                                Log Vitals
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.recentVitals?.map((v) => (
                                <div key={v._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">BP {v.bloodPressure.systolic}/{v.bloodPressure.diastolic} mmHg</p>
                                        <p className="text-xs text-gray-500">Heart Rate: {v.heartRate} bpm</p>
                                    </div>
                                    <p className="text-xs text-gray-400">{format(new Date(v.recordedAt), 'MMM d')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
