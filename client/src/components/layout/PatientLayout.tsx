import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, CalendarDays, Activity, UserCircle, HeartPulse, ClipboardList, ShoppingCart } from 'lucide-react';
import SidebarLayout from './SidebarLayout';

const navItems = [
    { to: '/patient/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/patient/prescriptions', icon: ClipboardList, label: 'Prescriptions' },
    { to: '/patient/store', icon: ShoppingCart, label: 'Medical Store' },
    { to: '/patient/vitals', icon: Activity, label: 'My Vitals' },
    { to: '/patient/profile', icon: UserCircle, label: 'My Profile' },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <SidebarLayout
            config={{
                brandIcon: HeartPulse,
                brandLabel: 'Patient Portal',
                brandName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
                navItems,
                rootPath: '/patient/',
                mainBg: 'bg-teal-50',
                sidebarBg: 'bg-white',
                    sidebarExtra: 'border-r border-gray-200',
                headerBorder: 'border-b border-gray-100',
                footerBorder: 'border-t border-gray-100',
                iconBg: 'bg-teal-600',
                    iconShape: 'rounded-md',
                brandLabelColor: 'text-gray-400',
                brandNameColor: 'text-gray-800',
                navActive: 'bg-teal-50 text-teal-700 border border-teal-100',
                navInactive: 'text-gray-500',
                navHover: 'hover:bg-gray-50 hover:text-gray-800',
                toggleClass: 'text-gray-400 hover:text-gray-700 hover:bg-gray-100',
                logoutClass: 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                onLogout: () => { logout(); navigate('/login'); },
            }}
        >
            {children}
        </SidebarLayout>
    );
}
