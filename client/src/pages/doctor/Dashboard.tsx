import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { CalendarDays, Users, Clock, CheckCircle, Stethoscope } from 'lucide-react';

interface Appointment {
    _id: string;
    patient: { firstName: string; lastName: string };
    appointmentDate: string;
    reasonForVisit: string;
    status: string;
}

interface DashboardData {
    profile: any;
    todaysAppointments: Appointment[];
    upcomingAppointments: Appointment[];
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function DoctorDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/doctor/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Good day, Dr. {data?.profile?.user?.firstName} 👨‍⚕️
                </h1>
                <p className="text-gray-500 mt-1">{data?.profile?.specialization || 'General Practitioner'} — {data?.profile?.isVerified ? '✅ Verified' : '⏳ Pending Verification'}</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-blue-50 rounded-lg p-3"><CalendarDays className="h-6 w-6 text-blue-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Today's Appointments</p>
                        <p className="text-2xl font-bold text-gray-900">{data?.todaysAppointments?.length ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-green-50 rounded-lg p-3"><CheckCircle className="h-6 w-6 text-green-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Upcoming</p>
                        <p className="text-2xl font-bold text-gray-900">{data?.upcomingAppointments?.length ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-purple-50 rounded-lg p-3"><Users className="h-6 w-6 text-purple-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Consultation Fee</p>
                        <p className="text-2xl font-bold text-gray-900">${data?.profile?.consultationFee ?? 0}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Appointments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Today's Schedule</h2>
                        <Link to="/doctor/appointments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all →</Link>
                    </div>
                    {data?.todaysAppointments?.length === 0 ? (
                        <div className="text-center py-10">
                            <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No appointments today</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.todaysAppointments?.map(a => (
                                <div key={a._id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{a.patient.firstName} {a.patient.lastName}</p>
                                        <p className="text-xs text-gray-500">{a.reasonForVisit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-700 flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(a.appointmentDate), 'h:mm a')}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[a.status]}`}>{a.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Upcoming Appointments</h2>
                    </div>
                    {data?.upcomingAppointments?.length === 0 ? (
                        <div className="text-center py-10">
                            <Stethoscope className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No upcoming appointments</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.upcomingAppointments?.map(a => (
                                <div key={a._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{a.patient.firstName} {a.patient.lastName}</p>
                                        <p className="text-xs text-gray-500">{a.reasonForVisit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-600">{format(new Date(a.appointmentDate), 'MMM d')}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[a.status]}`}>{a.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
