import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, CalendarDays, Stethoscope, UserCircle, ClipboardList, ShoppingCart } from 'lucide-react';
import SidebarLayout from './SidebarLayout';

const navItems = [
    { to: '/doctor/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/doctor/patients', icon: Users, label: 'My Patients' },
    { to: '/doctor/prescriptions', icon: ClipboardList, label: 'Prescriptions' },
    { to: '/doctor/patient-purchases', icon: ShoppingCart, label: 'Patient Purchases' },
    { to: '/doctor/profile', icon: UserCircle, label: 'My Profile' },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <SidebarLayout
            config={{
                brandIcon: Stethoscope,
                brandLabel: 'Doctor Portal',
                brandName: `Dr. ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
                navItems,
                rootPath: '/doctor/',
                mainBg: 'bg-blue-50',
                sidebarBg: 'bg-white',
                    sidebarExtra: 'border-r border-gray-200',
                headerBorder: 'border-b border-gray-100',
                footerBorder: 'border-t border-gray-100',
                iconBg: 'bg-blue-600',
                iconShape: 'rounded-md',
                brandLabelColor: 'text-gray-400',
                brandNameColor: 'text-gray-800',
                navActive: 'bg-blue-50 text-blue-700 border border-blue-100',
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
