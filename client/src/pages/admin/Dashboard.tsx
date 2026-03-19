import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Users, Package, CalendarDays, ShieldCheck } from 'lucide-react';
import { DashboardLoading, DashboardStatCard } from '../../components/dashboard/DashboardCommon';
import GreetingCard from '../../components/dashboard/GreetingCard';
import { useAuth } from '../../context/AuthContext';

interface AdminStats {
    totalPatients: number;
    totalDoctors: number;
    todaysAppointments: number;
    lowStockItemsCount: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

        const { user } = useAuth();

    useEffect(() => {
        api.get('/admin/dashboard').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardLoading role="admin" />;

    const cards = [
        { label: 'Total Patients', value: stats?.totalPatients ?? 0, icon: Users, color: 'bg-blue-50', iconColor: 'text-blue-600', link: '/admin/staff' },
        { label: 'Total Doctors', value: stats?.totalDoctors ?? 0, icon: ShieldCheck, color: 'bg-teal-50', iconColor: 'text-teal-600', link: '/admin/staff' },
        { label: "Today's Appointments", value: stats?.todaysAppointments ?? 0, icon: CalendarDays, color: 'bg-purple-50', iconColor: 'text-purple-600', link: '/admin/appointments' },
        { label: 'Low Stock Items', value: stats?.lowStockItemsCount ?? 0, icon: Package, color: 'bg-red-50', iconColor: 'text-red-500', link: '/admin/inventory', alert: (stats?.lowStockItemsCount ?? 0) > 0 },
    ];

    return (
        <div className="space-y-8">
                <GreetingCard
                    name={user?.firstName || 'Admin'}
                    subtitle="Overview of hospital operations"
                />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map(({ label, value, icon, color, iconColor, link, alert }) => (
                    <DashboardStatCard
                        key={label}
                        label={label}
                        value={value}
                        icon={icon}
                        iconWrapClass={color}
                        iconClass={iconColor}
                        linkTo={link}
                        alertText={alert ? 'Alert' : undefined}
                    />
                ))}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { to: '/admin/staff', label: 'Manage Staff', desc: 'View, verify, activate/deactivate doctors', icon: Users, color: 'border-blue-100 hover:border-blue-300' },
                    { to: '/admin/appointments', label: 'All Appointments', desc: 'Monitor appointments across all doctors', icon: CalendarDays, color: 'border-purple-100 hover:border-purple-300' },
                    { to: '/admin/inventory', label: 'Inventory', desc: 'Manage medicines, equipment, and supplies', icon: Package, color: 'border-teal-100 hover:border-teal-300' },
                ].map(({ to, label, desc, icon: Icon, color }) => (
                        <Link key={to} to={to} className={`bg-white rounded-md border ${color} p-5 transition-colors group`}>
                        <Icon className="h-6 w-6 text-gray-400 group-hover:text-teal-600 mb-3 transition-colors" />
                        <p className="font-semibold text-gray-800">{label}</p>
                        <p className="text-sm text-gray-400 mt-1">{desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
