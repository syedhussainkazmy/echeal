import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, Package, CalendarDays, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
    { to: '/admin/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/staff', icon: Users, label: 'Staff' },
    { to: '/admin/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/admin/inventory', icon: Package, label: 'Inventory' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-teal-500 rounded-lg p-2">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">eCheal Admin</p>
                            <p className="font-semibold text-sm truncate">{user?.firstName} {user?.lastName}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/admin/'}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-teal-600 text-white shadow'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                )
                            }
                        >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
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
