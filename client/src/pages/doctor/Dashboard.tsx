import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { CalendarDays, Users, Clock, CheckCircle, Stethoscope } from 'lucide-react';
import {
    DashboardEmptyState,
    DashboardLoading,
    DashboardSection,
    DashboardStatCard,
} from '../../components/dashboard/DashboardCommon';
import GreetingCard from '../../components/dashboard/GreetingCard';
import { AppointmentStatusBadge } from '../../components/appointments/AppointmentStatusBadge';

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

export default function DoctorDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/doctor/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardLoading role="doctor" />;

    return (
        <div className="space-y-8">
                <GreetingCard
                    name={`Dr. ${data?.profile?.user?.firstName ?? ''}`}
                    subtitle={`${data?.profile?.specialization || 'General Practitioner'} · ${data?.profile?.isVerified ? 'Verified' : 'Pending Verification'}`}
                />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <DashboardStatCard
                    label="Today's Appointments"
                    value={data?.todaysAppointments?.length ?? 0}
                    icon={CalendarDays}
                    iconWrapClass="bg-blue-50"
                    iconClass="text-blue-600"
                />
                <DashboardStatCard
                    label="Upcoming"
                    value={data?.upcomingAppointments?.length ?? 0}
                    icon={CheckCircle}
                    iconWrapClass="bg-green-50"
                    iconClass="text-green-600"
                />
                <DashboardStatCard
                    label="Consultation Fee"
                    value={`$${data?.profile?.consultationFee ?? 0}`}
                    icon={Users}
                    iconWrapClass="bg-purple-50"
                    iconClass="text-purple-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardSection
                    title="Today's Schedule"
                    action={<Link to="/doctor/appointments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all -&gt;</Link>}
                >
                    {data?.todaysAppointments?.length === 0 ? (
                        <DashboardEmptyState icon={CalendarDays} title="No appointments today" />
                    ) : (
                        <div className="space-y-3">
                            {data?.todaysAppointments?.map(a => (
                                  <div key={a._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{a.patient.firstName} {a.patient.lastName}</p>
                                        <p className="text-xs text-gray-500">{a.reasonForVisit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-700 flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(a.appointmentDate), 'h:mm a')}</p>
                                        <AppointmentStatusBadge status={a.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardSection>

                <DashboardSection title="Upcoming Appointments">
                    {data?.upcomingAppointments?.length === 0 ? (
                        <DashboardEmptyState icon={Stethoscope} title="No upcoming appointments" />
                    ) : (
                        <div className="space-y-3">
                            {data?.upcomingAppointments?.map(a => (
                                  <div key={a._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{a.patient.firstName} {a.patient.lastName}</p>
                                        <p className="text-xs text-gray-500">{a.reasonForVisit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-600">{format(new Date(a.appointmentDate), 'MMM d')}</p>
                                        <AppointmentStatusBadge status={a.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardSection>
            </div>
        </div>
    );
}
