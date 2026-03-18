import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, CalendarDays, LogOut, Stethoscope, UserCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
    { to: '/doctor/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/doctor/patients', icon: Users, label: 'My Patients' },
    { to: '/doctor/profile', icon: UserCircle, label: 'My Profile' },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-blue-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 rounded-xl p-2">
                            <Stethoscope className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Doctor Portal</p>
                            <p className="font-semibold text-sm text-gray-800 truncate">Dr. {user?.firstName} {user?.lastName}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/doctor/'}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                )
                            }
                        >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}
