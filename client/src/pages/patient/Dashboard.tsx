import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { HeartPulse, CalendarDays, Activity, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import {
    DashboardEmptyState,
    DashboardLoading,
    DashboardSection,
    DashboardStatCard,
} from '../../components/dashboard/DashboardCommon';
import GreetingCard from '../../components/dashboard/GreetingCard';
import { AppointmentStatusBadge } from '../../components/appointments/AppointmentStatusBadge';

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

export default function PatientDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/patient/dashboard').then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardLoading role="patient" />;

    return (
        <div className="space-y-8">
            <GreetingCard
                name={data?.profile?.user?.firstName || 'there'}
                subtitle="Here's your health overview"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <DashboardStatCard
                    label="Blood Group"
                    value={data?.profile?.bloodGroup || '-'}
                    icon={HeartPulse}
                    iconWrapClass="bg-teal-50"
                    iconClass="text-teal-600"
                />
                <DashboardStatCard
                    label="Last Heart Rate"
                    value={data?.recentVitals?.[0]?.heartRate ? `${data.recentVitals[0].heartRate} bpm` : '-'}
                    icon={Activity}
                    iconWrapClass="bg-blue-50"
                    iconClass="text-blue-600"
                />
                <DashboardStatCard
                    label="Upcoming Appointments"
                    value={data?.upcomingAppointments?.length ?? 0}
                    icon={CalendarDays}
                    iconWrapClass="bg-purple-50"
                    iconClass="text-purple-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardSection
                    title="Upcoming Appointments"
                    action={<Link to="/patient/appointments" className="text-sm text-teal-600 hover:text-teal-800 font-medium">View all -&gt;</Link>}
                >
                    {data?.upcomingAppointments?.length === 0 ? (
                        <DashboardEmptyState
                            icon={Stethoscope}
                            title="No upcoming appointments"
                            action={
                                        <Link to="/patient/appointments" className="mt-3 inline-block text-sm bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 transition-colors">
                                    Book Now
                                </Link>
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            {data?.upcomingAppointments?.map((appt) => (
                                        <div key={appt._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">Dr. {appt.doctor.firstName} {appt.doctor.lastName}</p>
                                        <p className="text-xs text-gray-500">{appt.reasonForVisit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-700">{format(new Date(appt.appointmentDate), 'MMM d, yyyy')}</p>
                                        <AppointmentStatusBadge status={appt.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardSection>

                <DashboardSection
                    title="Recent Vitals"
                    action={<Link to="/patient/vitals" className="text-sm text-teal-600 hover:text-teal-800 font-medium">View all -&gt;</Link>}
                >
                    {data?.recentVitals?.length === 0 ? (
                        <DashboardEmptyState
                            icon={Activity}
                            title="No vitals recorded yet"
                            action={
                                        <Link to="/patient/vitals" className="mt-3 inline-block text-sm bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 transition-colors">
                                    Log Vitals
                                </Link>
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            {data?.recentVitals?.map((v) => (
                                        <div key={v._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">BP {v.bloodPressure.systolic}/{v.bloodPressure.diastolic} mmHg</p>
                                        <p className="text-xs text-gray-500">Heart Rate: {v.heartRate} bpm</p>
                                    </div>
                                    <p className="text-xs text-gray-400">{format(new Date(v.recordedAt), 'MMM d')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardSection>
            </div>
        </div>
    );
}
