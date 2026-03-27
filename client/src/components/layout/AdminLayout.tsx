import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, Package, CalendarDays, ShieldCheck, ClipboardList, FileText } from 'lucide-react';
import SidebarLayout from './SidebarLayout';

const navItems = [
    { to: '/admin/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/staff', icon: Users, label: 'Staff' },
    { to: '/admin/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/admin/prescriptions', icon: ClipboardList, label: 'Prescriptions' },
    { to: '/admin/inventory', icon: Package, label: 'Inventory' },
    { to: '/admin/reports', icon: FileText, label: 'Reports' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <SidebarLayout
            config={{
                brandIcon: ShieldCheck,
                brandLabel: 'eCheal Admin',
                brandName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
                navItems,
                rootPath: '/admin/',
                mainBg: 'bg-slate-50',
                sidebarBg: 'bg-slate-900',
                headerBorder: 'border-b border-slate-700',
                footerBorder: 'border-t border-slate-700',
                iconBg: 'bg-teal-600',
                iconShape: 'rounded-lg',
                brandLabelColor: 'text-slate-400',
                brandNameColor: 'text-white',
                    navActive: 'bg-teal-600 text-white',
                navInactive: 'text-slate-400',
                navHover: 'hover:bg-slate-800 hover:text-white',
                toggleClass: 'text-slate-400 hover:text-white hover:bg-slate-800',
                logoutClass: 'text-slate-400 hover:bg-slate-800 hover:text-white',
                onLogout: () => { logout(); navigate('/login'); },
            }}
        >
            {children}
        </SidebarLayout>
    );
}
