import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Users, Package, CalendarDays, ShieldCheck } from 'lucide-react';

interface AdminStats {
    totalPatients: number;
    totalDoctors: number;
    todaysAppointments: number;
    lowStockItemsCount: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/dashboard').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>;

    const cards = [
        { label: 'Total Patients', value: stats?.totalPatients ?? 0, icon: Users, color: 'bg-blue-50', iconColor: 'text-blue-600', link: '/admin/staff' },
        { label: 'Total Doctors', value: stats?.totalDoctors ?? 0, icon: ShieldCheck, color: 'bg-teal-50', iconColor: 'text-teal-600', link: '/admin/staff' },
        { label: "Today's Appointments", value: stats?.todaysAppointments ?? 0, icon: CalendarDays, color: 'bg-purple-50', iconColor: 'text-purple-600', link: '/admin/appointments' },
        { label: 'Low Stock Items', value: stats?.lowStockItemsCount ?? 0, icon: Package, color: 'bg-red-50', iconColor: 'text-red-500', link: '/admin/inventory', alert: (stats?.lowStockItemsCount ?? 0) > 0 },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Hospital Administration</h1>
                <p className="text-gray-500 mt-1">Overview of hospital operations</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map(({ label, value, icon: Icon, color, iconColor, link, alert }) => (
                    <Link key={label} to={link} className="group">
                        <div className={`bg-white rounded-xl border ${alert ? 'border-red-200' : 'border-gray-100'} shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className={`${color} rounded-lg p-2.5`}>
                                    <Icon className={`h-5 w-5 ${iconColor}`} />
                                </div>
                                {alert && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium animate-pulse">Alert</span>}
                            </div>
                            <p className={`text-3xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                            <p className="text-sm text-gray-500 mt-1">{label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { to: '/admin/staff', label: 'Manage Staff', desc: 'View, verify, activate/deactivate doctors', icon: Users, color: 'border-blue-100 hover:border-blue-300' },
                    { to: '/admin/appointments', label: 'All Appointments', desc: 'Monitor appointments across all doctors', icon: CalendarDays, color: 'border-purple-100 hover:border-purple-300' },
                    { to: '/admin/inventory', label: 'Inventory', desc: 'Manage medicines, equipment, and supplies', icon: Package, color: 'border-teal-100 hover:border-teal-300' },
                ].map(({ to, label, desc, icon: Icon, color }) => (
                    <Link key={to} to={to} className={`bg-white rounded-xl border-2 ${color} p-5 transition-colors group`}>
                        <Icon className="h-6 w-6 text-gray-400 group-hover:text-teal-600 mb-3 transition-colors" />
                        <p className="font-semibold text-gray-800">{label}</p>
                        <p className="text-sm text-gray-400 mt-1">{desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
